import { db } from "@auxilio-pedagogico/db";
import {
  answer,
  caseStudy,
  question,
  student,
  studentAssignment,
} from "@auxilio-pedagogico/db/schema/domain";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { auditedProcedure, type DbTransaction } from "../audit";
import {
  ROLES,
  assertCanViewOrEditCaseStudy,
  type Actor,
  type Role,
} from "../policy";
import { protectedProcedure, router } from "../trpc";
import {
  caseStudyCreateSchema,
  caseStudyIdInputSchema,
  caseStudyListByStudentSchema,
  caseStudySaveAnswersSchema,
  hasUnfilledRequiredAnswers,
  rejectsInactiveQuestionWithoutAnswer,
  resolveAnswerQuestionSnapshot,
  serializeAnswerValue,
  type QuestionSnapshotSource,
} from "./case-study-schemas";
import type { QuestionType } from "./question-schemas";

function actorFromSession(sessionUser: {
  id: string;
  role?: string | null;
}): Actor {
  const role = sessionUser.role;
  if (!role || !ROLES.includes(role as Role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Perfil de usuário inválido",
    });
  }
  return { id: sessionUser.id, role: role as Role };
}

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
});
