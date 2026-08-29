import { db } from "@auxilio-pedagogico/db";
import {
  student,
  studentAssignment,
} from "@auxilio-pedagogico/db/schema/domain";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { auditedProcedure } from "../audit";
import {
  actorFromSession,
  assertCan,
  assertCanAccessStudent,
  can,
} from "../policy";
import { protectedProcedure, router } from "../trpc";

const shiftSchema = z.enum(["morning", "afternoon", "full_day"]);

const studentInputSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  className: z.string().trim().max(120).optional().nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)")
    .optional()
    .nullable(),
  guardian: z.string().trim().max(200).optional().nullable(),
  shift: shiftSchema.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

async function assignedIdsForTeacher(teacherId: string): Promise<string[]> {
  const rows = await db
    .select({ studentId: studentAssignment.studentId })
    .from(studentAssignment)
    .where(eq(studentAssignment.teacherId, teacherId));
  return rows.map((r) => r.studentId);
}

const studentSelect = {
  id: student.id,
  name: student.name,
  className: student.className,
  birthDate: student.birthDate,
  guardian: student.guardian,
  shift: student.shift,
  notes: student.notes,
  active: student.active,
  createdAt: student.createdAt,
  updatedAt: student.updatedAt,
} as const;

export const studentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const actor = actorFromSession(ctx.session.user);

    if (can(actor.role, "manageStudents")) {
      return db
        .select(studentSelect)
        .from(student)
        .orderBy(asc(student.name));
    }

    if (actor.role === "teacher") {
      const assigned = await assignedIdsForTeacher(actor.id);
      if (assigned.length === 0) return [];
      return db
        .select(studentSelect)
        .from(student)
        .where(inArray(student.id, assigned))
        .orderBy(asc(student.name));
    }

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Permissão negada: acesso a alunos",
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      const assigned =
        actor.role === "teacher" ? await assignedIdsForTeacher(actor.id) : [];

      assertCanAccessStudent(actor, {
        studentId: input.id,
        assignedStudentIds: assigned,
      });

      const [row] = await db
        .select(studentSelect)
        .from(student)
        .where(eq(student.id, input.id))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Aluno não encontrado",
        });
      }

      return row;
    }),

  create: auditedProcedure
    .input(studentInputSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageStudents");

      return ctx.auditMutation(async (tx) => {
        const [created] = await tx
          .insert(student)
          .values({
            name: input.name,
            className: input.className ?? null,
            birthDate: input.birthDate ?? null,
            guardian: input.guardian ?? null,
            shift: input.shift ?? null,
            notes: input.notes ?? null,
            active: true,
          })
          .returning(studentSelect);

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar aluno",
          });
        }

        return {
          result: created,
          audit: {
            action: "student.create",
            entityType: "student",
            entityId: created.id,
            after: created,
          },
        };
      });
    }),

  update: auditedProcedure
    .input(
      studentInputSchema.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageStudents");

      return ctx.auditMutation(async (tx) => {
        const [before] = await tx
          .select(studentSelect)
          .from(student)
          .where(eq(student.id, input.id))
          .limit(1);

        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aluno não encontrado",
          });
        }

        const [after] = await tx
          .update(student)
          .set({
            name: input.name,
            className: input.className ?? null,
            birthDate: input.birthDate ?? null,
            guardian: input.guardian ?? null,
            shift: input.shift ?? null,
            notes: input.notes ?? null,
          })
          .where(eq(student.id, input.id))
          .returning(studentSelect);

        return {
          result: after,
          audit: {
            action: "student.update",
            entityType: "student",
            entityId: input.id,
            before,
            after: after ?? null,
          },
        };
      });
    }),

  setActive: auditedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageStudents");

      return ctx.auditMutation(async (tx) => {
        const [before] = await tx
          .select(studentSelect)
          .from(student)
          .where(eq(student.id, input.id))
          .limit(1);

        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aluno não encontrado",
          });
        }

        const [after] = await tx
          .update(student)
          .set({ active: input.active })
          .where(eq(student.id, input.id))
          .returning(studentSelect);

        return {
          result: after,
          audit: {
            action: input.active ? "student.activate" : "student.deactivate",
            entityType: "student",
            entityId: input.id,
            before,
            after: after ?? null,
          },
        };
      });
    }),
});
