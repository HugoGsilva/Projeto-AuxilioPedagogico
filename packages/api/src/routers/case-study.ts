import { db } from "@auxilio-pedagogico/db";
import { user } from "@auxilio-pedagogico/db/schema/auth";
import {
  answer,
  caseStudy,
  pdfSettings,
  question,
  student,
  studentAssignment,
} from "@auxilio-pedagogico/db/schema/domain";
import { env } from "@auxilio-pedagogico/env/server";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { auditedProcedure, type DbTransaction } from "../audit";
import { convertHtmlToPdf } from "../pdf/gotenberg";
import { renderCaseStudyHtml } from "../pdf/template";
import {
  actorFromSession,
  assertCan,
  assertCanViewOrEditCaseStudy,
} from "../policy";
import { protectedProcedure, router } from "../trpc";
import {
  caseStudyCreateSchema,
  caseStudyIdInputSchema,
  caseStudyListByStudentSchema,
  caseStudySaveAnswersSchema,
  caseStudySaveFreeReportSchema,
  hasUnfilledRequiredAnswers,
  isBlankAnswerValue,
  rejectsInactiveQuestionWithoutAnswer,
  resolveAnswerQuestionSnapshot,
  serializeAnswerValue,
  type QuestionSnapshotSource,
} from "./case-study-schemas";
import type { QuestionType } from "./question-schemas";

async function assignedIdsForTeacher(teacherId: string): Promise<string[]> {
  const rows = await db
    .select({ studentId: studentAssignment.studentId })
    .from(studentAssignment)
    .where(eq(studentAssignment.teacherId, teacherId));
  return rows.map((r) => r.studentId);
}

const caseStudySelect = {
  id: caseStudy.id,
  studentId: caseStudy.studentId,
  createdById: caseStudy.createdById,
  createdAt: caseStudy.createdAt,
  updatedAt: caseStudy.updatedAt,
} as const;

const answerSelect = {
  id: answer.id,
  questionId: answer.questionId,
  value: answer.value,
  questionSnapshot: answer.questionSnapshot,
  createdAt: answer.createdAt,
  updatedAt: answer.updatedAt,
} as const;

type QueryClient = Pick<typeof db, "select"> | DbTransaction;

async function loadCaseStudyDetail(client: QueryClient, id: string) {
  const [row] = await client
    .select({
      ...caseStudySelect,
      freeReport: caseStudy.freeReport,
      studentName: student.name,
      className: student.className,
    })
    .from(caseStudy)
    .innerJoin(student, eq(caseStudy.studentId, student.id))
    .where(eq(caseStudy.id, id))
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Estudo de caso não encontrado",
    });
  }

  const answers = await client
    .select(answerSelect)
    .from(answer)
    .where(eq(answer.caseStudyId, id))
    .orderBy(asc(answer.createdAt));

  return { ...row, answers };
}

function toSnapshotSource(row: {
  prompt: string;
  type: QuestionType;
  options: string[] | null;
  section: string | null;
  required: boolean;
}): QuestionSnapshotSource {
  return {
    prompt: row.prompt,
    type: row.type,
    options: row.options,
    section: row.section,
    required: row.required,
  };
}

function badRequest(message: string): never {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message,
  });
}

export const caseStudyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const actor = actorFromSession(ctx.session.user);
    // it_admin não enxerga estudos de caso (ADR-0002).
    assertCan(actor.role, "viewCaseStudy");

    const scopedToAssigned = actor.role === "teacher";
    const assigned = scopedToAssigned
      ? await assignedIdsForTeacher(actor.id)
      : [];
    if (scopedToAssigned && assigned.length === 0) return [];

    return db
      .select({
        id: caseStudy.id,
        studentId: caseStudy.studentId,
        studentName: student.name,
        className: student.className,
        createdByName: user.name,
        createdAt: caseStudy.createdAt,
        updatedAt: caseStudy.updatedAt,
      })
      .from(caseStudy)
      .innerJoin(student, eq(caseStudy.studentId, student.id))
      .innerJoin(user, eq(caseStudy.createdById, user.id))
      .where(
        scopedToAssigned ? inArray(caseStudy.studentId, assigned) : undefined,
      )
      .orderBy(desc(caseStudy.updatedAt));
  }),

  /**
   * Agregado por aluno para a listagem: nº de estudos + completude do mais
   * recente. Mesma régua da validação de saveAnswers: perguntas ativas e
   * obrigatórias VIGENTES (não o snapshot — ADR-0003 congela só a exibição).
   * Retorno esparso: aluno sem estudo não aparece em items.
   */
  completionByStudent: protectedProcedure.query(async ({ ctx }) => {
    const actor = actorFromSession(ctx.session.user);
    assertCan(actor.role, "viewCaseStudy");

    const scopedToAssigned = actor.role === "teacher";
    const assigned = scopedToAssigned
      ? await assignedIdsForTeacher(actor.id)
      : [];

    const requiredActive = await db
      .select({ id: question.id })
      .from(question)
      .where(and(eq(question.active, true), eq(question.required, true)));
    const requiredIds = requiredActive.map((row) => row.id);

    if (scopedToAssigned && assigned.length === 0) {
      return { requiredTotal: requiredIds.length, items: [] };
    }

    const studies = await db
      .select({
        id: caseStudy.id,
        studentId: caseStudy.studentId,
      })
      .from(caseStudy)
      .where(
        scopedToAssigned ? inArray(caseStudy.studentId, assigned) : undefined,
      )
      .orderBy(desc(caseStudy.createdAt), desc(caseStudy.id));

    // Lista já ordenada: o primeiro estudo visto por aluno é o mais recente.
    const byStudent = new Map<string, { latestId: string; count: number }>();
    for (const row of studies) {
      const entry = byStudent.get(row.studentId);
      if (entry) {
        entry.count += 1;
      } else {
        byStudent.set(row.studentId, { latestId: row.id, count: 1 });
      }
    }

    const latestIds = [...byStudent.values()].map((entry) => entry.latestId);
    const answers =
      latestIds.length === 0 || requiredIds.length === 0
        ? []
        : await db
            .select({
              caseStudyId: answer.caseStudyId,
              questionId: answer.questionId,
              value: answer.value,
            })
            .from(answer)
            .where(
              and(
                inArray(answer.caseStudyId, latestIds),
                inArray(answer.questionId, requiredIds),
              ),
            );

    const valuesByCaseStudy = new Map<string, Map<string, string | null>>();
    for (const row of answers) {
      const map =
        valuesByCaseStudy.get(row.caseStudyId) ??
        new Map<string, string | null>();
      map.set(row.questionId, row.value);
      valuesByCaseStudy.set(row.caseStudyId, map);
    }

    const items = [...byStudent.entries()].map(([studentId, entry]) => {
      const values =
        valuesByCaseStudy.get(entry.latestId) ??
        new Map<string, string | null>();
      const requiredFilled = requiredIds.filter(
        (id) => !isBlankAnswerValue(values.get(id)),
      ).length;
      return {
        studentId,
        caseStudyCount: entry.count,
        latestCaseStudyId: entry.latestId,
        requiredFilled,
        complete: requiredFilled === requiredIds.length,
      };
    });

    return { requiredTotal: requiredIds.length, items };
  }),

  listByStudent: protectedProcedure
    .input(caseStudyListByStudentSchema)
    .query(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      const assigned =
        actor.role === "teacher" ? await assignedIdsForTeacher(actor.id) : [];

      assertCanViewOrEditCaseStudy(actor, "viewCaseStudy", {
        studentId: input.studentId,
        assignedStudentIds: assigned,
      });

      const [studentRow] = await db
        .select({ id: student.id })
        .from(student)
        .where(eq(student.id, input.studentId))
        .limit(1);

      if (!studentRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Aluno não encontrado",
        });
      }

      return db
        .select(caseStudySelect)
        .from(caseStudy)
        .where(eq(caseStudy.studentId, input.studentId))
        .orderBy(desc(caseStudy.createdAt));
    }),

  byId: protectedProcedure
    .input(caseStudyIdInputSchema)
    .query(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      const assigned =
        actor.role === "teacher" ? await assignedIdsForTeacher(actor.id) : [];

      const [existing] = await db
        .select({
          id: caseStudy.id,
          studentId: caseStudy.studentId,
        })
        .from(caseStudy)
        .where(eq(caseStudy.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estudo de caso não encontrado",
        });
      }

      assertCanViewOrEditCaseStudy(actor, "viewCaseStudy", {
        studentId: existing.studentId,
        assignedStudentIds: assigned,
      });

      return loadCaseStudyDetail(db, input.id);
    }),

  create: auditedProcedure
    .input(caseStudyCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      const assigned =
        actor.role === "teacher" ? await assignedIdsForTeacher(actor.id) : [];

      assertCanViewOrEditCaseStudy(actor, "editCaseStudy", {
        studentId: input.studentId,
        assignedStudentIds: assigned,
      });

      return ctx.auditMutation(async (tx) => {
        const [studentRow] = await tx
          .select({ id: student.id })
          .from(student)
          .where(eq(student.id, input.studentId))
          .limit(1);

        if (!studentRow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aluno não encontrado",
          });
        }

        const [created] = await tx
          .insert(caseStudy)
          .values({
            studentId: input.studentId,
            createdById: actor.id,
            freeReport: null,
          })
          .returning(caseStudySelect);

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar estudo de caso",
          });
        }

        return {
          result: created,
          audit: {
            action: "caseStudy.create",
            entityType: "caseStudy",
            entityId: created.id,
            after: created,
          },
        };
      });
    }),

  saveAnswers: auditedProcedure
    .input(caseStudySaveAnswersSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      const assigned =
        actor.role === "teacher" ? await assignedIdsForTeacher(actor.id) : [];

      return ctx.auditMutation(async (tx) => {
        const [existingCaseStudy] = await tx
          .select(caseStudySelect)
          .from(caseStudy)
          .where(eq(caseStudy.id, input.caseStudyId))
          .limit(1);

        if (!existingCaseStudy) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estudo de caso não encontrado",
          });
        }

        assertCanViewOrEditCaseStudy(actor, "editCaseStudy", {
          studentId: existingCaseStudy.studentId,
          assignedStudentIds: assigned,
        });

        const questionIds = input.answers.map((item) => item.questionId);
        const uniqueIds = new Set(questionIds);
        if (uniqueIds.size !== questionIds.length) {
          badRequest("Pergunta duplicada nas respostas");
        }

        const existingAnswers = await tx
          .select(answerSelect)
          .from(answer)
          .where(eq(answer.caseStudyId, input.caseStudyId));
        const existingByQuestionId = new Map(
          existingAnswers.map((row) => [row.questionId, row]),
        );

        const questionRows =
          questionIds.length === 0
            ? []
            : await tx
                .select({
                  id: question.id,
                  prompt: question.prompt,
                  type: question.type,
                  options: question.options,
                  section: question.section,
                  required: question.required,
                  active: question.active,
                })
                .from(question)
                .where(inArray(question.id, questionIds));

        if (questionRows.length !== questionIds.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pergunta não encontrada",
          });
        }

        const questionById = new Map(questionRows.map((row) => [row.id, row]));

        type Prepared = {
          questionId: string;
          value: string | null;
          existing: (typeof existingAnswers)[number] | undefined;
          snapshotSource: QuestionSnapshotSource;
        };

        const prepared: Prepared[] = [];

        for (const item of input.answers) {
          const questionRow = questionById.get(item.questionId);
          if (!questionRow) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Pergunta não encontrada",
            });
          }

          const existingAnswer = existingByQuestionId.get(item.questionId);
          if (
            rejectsInactiveQuestionWithoutAnswer(
              questionRow.active,
              Boolean(existingAnswer),
            )
          ) {
            badRequest("Não é possível responder a uma pergunta inativa");
          }

          const definition = existingAnswer
            ? {
                type: existingAnswer.questionSnapshot.type,
                options: existingAnswer.questionSnapshot.options,
                required: existingAnswer.questionSnapshot.required,
              }
            : {
                type: questionRow.type,
                options: questionRow.options,
                required: questionRow.required,
              };

          let value: string | null;
          try {
            value = serializeAnswerValue(definition, item.value);
          } catch (error) {
            badRequest(
              error instanceof Error ? error.message : "Resposta inválida",
            );
          }

          prepared.push({
            questionId: item.questionId,
            value,
            existing: existingAnswer,
            snapshotSource: toSnapshotSource(questionRow),
          });
        }

        const activeRequired = await tx
          .select({ id: question.id })
          .from(question)
          .where(and(eq(question.active, true), eq(question.required, true)));

        const valueByQuestionId = new Map<string, string | null>();
        for (const row of existingAnswers) {
          valueByQuestionId.set(row.questionId, row.value);
        }
        for (const item of prepared) {
          valueByQuestionId.set(item.questionId, item.value);
        }

        if (
          hasUnfilledRequiredAnswers(
            activeRequired.map((row) => row.id),
            valueByQuestionId,
          )
        ) {
          badRequest(
            "Todas as perguntas obrigatórias ativas devem ser preenchidas",
          );
        }

        const beforeAnswers = existingAnswers.map((row) => ({
          questionId: row.questionId,
          value: row.value,
          questionSnapshot: row.questionSnapshot,
        }));

        for (const item of prepared) {
          if (item.existing) {
            await tx
              .update(answer)
              .set({ value: item.value })
              .where(eq(answer.id, item.existing.id));
          } else {
            await tx.insert(answer).values({
              caseStudyId: input.caseStudyId,
              questionId: item.questionId,
              value: item.value,
              questionSnapshot: resolveAnswerQuestionSnapshot(
                undefined,
                item.snapshotSource,
              ),
            });
          }
        }

        await tx
          .update(caseStudy)
          .set({ updatedAt: new Date() })
          .where(eq(caseStudy.id, input.caseStudyId));

        const result = await loadCaseStudyDetail(tx, input.caseStudyId);
        const afterAnswers = result.answers.map((row) => ({
          questionId: row.questionId,
          value: row.value,
          questionSnapshot: row.questionSnapshot,
        }));

        return {
          result,
          audit: {
            action: "answer.upsert",
            entityType: "answer",
            entityId: input.caseStudyId,
            before: { answers: beforeAnswers },
            after: { answers: afterAnswers },
          },
        };
      });
    }),

  saveFreeReport: auditedProcedure
    .input(caseStudySaveFreeReportSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      const assigned =
        actor.role === "teacher" ? await assignedIdsForTeacher(actor.id) : [];

      return ctx.auditMutation(async (tx) => {
        const [existing] = await tx
          .select({
            studentId: caseStudy.studentId,
            freeReport: caseStudy.freeReport,
          })
          .from(caseStudy)
          .where(eq(caseStudy.id, input.caseStudyId))
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estudo de caso não encontrado",
          });
        }

        assertCanViewOrEditCaseStudy(actor, "editCaseStudy", {
          studentId: existing.studentId,
          assignedStudentIds: assigned,
        });

        const freeReport = isBlankAnswerValue(input.freeReport)
          ? null
          : (input.freeReport?.trim() ?? null);

        const [updated] = await tx
          .update(caseStudy)
          .set({ freeReport })
          .where(eq(caseStudy.id, input.caseStudyId))
          .returning({ id: caseStudy.id, freeReport: caseStudy.freeReport });

        if (!updated) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao salvar o relatório livre",
          });
        }

        return {
          result: updated,
          audit: {
            action: "freeReport.update",
            entityType: "freeReport",
            entityId: input.caseStudyId,
            before: { freeReport: existing.freeReport },
            after: { freeReport: updated.freeReport },
          },
        };
      });
    }),

  generatePdf: auditedProcedure
    .input(caseStudyIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      // Direção e pedagoga geram; professora e TI não (ADR-0002). Primeiro
      // gate: evita a query de atribuições para quem nunca poderá gerar.
      assertCan(actor.role, "generatePdf");
      const assigned =
        actor.role === "teacher" ? await assignedIdsForTeacher(actor.id) : [];

      const [existing] = await db
        .select({ id: caseStudy.id, studentId: caseStudy.studentId })
        .from(caseStudy)
        .where(eq(caseStudy.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Estudo de caso não encontrado",
        });
      }

      assertCanViewOrEditCaseStudy(actor, "viewCaseStudy", {
        studentId: existing.studentId,
        assignedStudentIds: assigned,
      });

      if (!env.GOTENBERG_URL) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Serviço de geração de PDF não configurado neste ambiente.",
        });
      }

      // Leituras independentes em paralelo; só o nome do criador depende do detalhe.
      const [detail, [studentRow], [settings]] = await Promise.all([
        loadCaseStudyDetail(db, input.id),
        db
          .select({
            birthDate: student.birthDate,
            guardian: student.guardian,
            shift: student.shift,
          })
          .from(student)
          .where(eq(student.id, existing.studentId))
          .limit(1),
        db
          .select({
            schoolName: pdfSettings.schoolName,
            institutionalInfo: pdfSettings.institutionalInfo,
            headerText: pdfSettings.headerText,
            footerText: pdfSettings.footerText,
          })
          .from(pdfSettings)
          .orderBy(asc(pdfSettings.createdAt))
          .limit(1),
      ]);
      const [createdBy] = await db
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, detail.createdById))
        .limit(1);

      const generatedAt = new Date();
      const html = renderCaseStudyHtml({
        settings: settings ?? null,
        student: {
          name: detail.studentName,
          className: detail.className,
          birthDate: studentRow?.birthDate ?? null,
          guardian: studentRow?.guardian ?? null,
          shift: studentRow?.shift ?? null,
        },
        createdByName: createdBy?.name ?? null,
        generatedByName: ctx.session.user.name ?? "—",
        generatedAt,
        answers: detail.answers.map((row) => ({
          questionSnapshot: row.questionSnapshot,
          value: row.value,
        })),
        freeReport: detail.freeReport,
      });

      /* Conversão FORA da transação: HTTP externo não pode segurar lock no
       * Postgres. Falha aqui não é auditada — geração que não aconteceu. */
      let bytes: Uint8Array;
      try {
        bytes = await convertHtmlToPdf(env.GOTENBERG_URL, html);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível gerar o PDF no momento.",
        });
      }

      const slug = detail.studentName
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fileName = `estudo-de-caso-${slug || "aluno"}.pdf`;

      // A transação existe só para a linha de auditoria (ADR-0004).
      return ctx.auditMutation(async () => ({
        result: {
          fileName,
          mimeType: "application/pdf" as const,
          base64: Buffer.from(bytes).toString("base64"),
        },
        audit: {
          action: "pdfGeneration.create",
          entityType: "pdfGeneration",
          entityId: input.id,
          after: {
            caseStudyId: input.id,
            studentId: existing.studentId,
            studentName: detail.studentName,
            fileName,
            byteLength: bytes.length,
            generatedAt: generatedAt.toISOString(),
          },
        },
      }));
    }),
});
