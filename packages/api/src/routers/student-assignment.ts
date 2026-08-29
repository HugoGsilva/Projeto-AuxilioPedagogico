import { db } from "@auxilio-pedagogico/db";
import { user } from "@auxilio-pedagogico/db/schema/auth";
import {
  student,
  studentAssignment,
} from "@auxilio-pedagogico/db/schema/domain";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { auditedProcedure } from "../audit";
import { actorFromSession, assertCan } from "../policy";
import { protectedProcedure, router } from "../trpc";

export const studentAssignmentRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    assertCan(actorFromSession(ctx.session.user).role, "manageAssignments");

    return db
      .select({
        id: studentAssignment.id,
        studentId: studentAssignment.studentId,
        teacherId: studentAssignment.teacherId,
        assignedById: studentAssignment.assignedById,
        createdAt: studentAssignment.createdAt,
        studentName: student.name,
        teacherName: user.name,
        teacherEmail: user.email,
      })
      .from(studentAssignment)
      .innerJoin(student, eq(studentAssignment.studentId, student.id))
      .innerJoin(user, eq(studentAssignment.teacherId, user.id))
      .orderBy(asc(student.name), asc(user.name));
  }),

  teachers: protectedProcedure.query(async ({ ctx }) => {
    assertCan(actorFromSession(ctx.session.user).role, "manageAssignments");

    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(and(eq(user.role, "teacher"), eq(user.active, true)))
      .orderBy(asc(user.name));
  }),

  create: auditedProcedure
    .input(
      z.object({
        studentId: z.string().uuid(),
        teacherId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageAssignments");

      return ctx.auditMutation(async (tx) => {
        const [studentRow] = await tx
          .select({ id: student.id, name: student.name, active: student.active })
          .from(student)
          .where(eq(student.id, input.studentId))
          .limit(1);

        if (!studentRow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Aluno não encontrado",
          });
        }

        if (!studentRow.active) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível atribuir aluno inativo",
          });
        }

        const [teacherRow] = await tx
          .select({
            id: user.id,
            name: user.name,
            role: user.role,
            active: user.active,
          })
          .from(user)
          .where(eq(user.id, input.teacherId))
          .limit(1);

        if (!teacherRow || teacherRow.role !== "teacher") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "O usuário informado não é uma professora ativa",
          });
        }

        if (!teacherRow.active) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A professora está desativada",
          });
        }

        const [existing] = await tx
          .select({ id: studentAssignment.id })
          .from(studentAssignment)
          .where(
            and(
              eq(studentAssignment.studentId, input.studentId),
              eq(studentAssignment.teacherId, input.teacherId),
            ),
          )
          .limit(1);

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Esta atribuição já existe",
          });
        }

        const [created] = await tx
          .insert(studentAssignment)
          .values({
            studentId: input.studentId,
            teacherId: input.teacherId,
            assignedById: actor.id,
          })
          .returning({
            id: studentAssignment.id,
            studentId: studentAssignment.studentId,
            teacherId: studentAssignment.teacherId,
            assignedById: studentAssignment.assignedById,
            createdAt: studentAssignment.createdAt,
          });

        return {
          result: created,
          audit: {
            action: "studentAssignment.create",
            entityType: "studentAssignment",
            entityId: created?.id ?? null,
            after: {
              ...created,
              studentName: studentRow.name,
              teacherName: teacherRow.name,
            },
          },
        };
      });
    }),

  remove: auditedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageAssignments");

      return ctx.auditMutation(async (tx) => {
        const [before] = await tx
          .select({
            id: studentAssignment.id,
            studentId: studentAssignment.studentId,
            teacherId: studentAssignment.teacherId,
            assignedById: studentAssignment.assignedById,
            createdAt: studentAssignment.createdAt,
          })
          .from(studentAssignment)
          .where(eq(studentAssignment.id, input.id))
          .limit(1);

        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Atribuição não encontrada",
          });
        }

        await tx
          .delete(studentAssignment)
          .where(eq(studentAssignment.id, input.id));

        return {
          result: { ok: true },
          audit: {
            action: "studentAssignment.remove",
            entityType: "studentAssignment",
            entityId: input.id,
            before,
            after: null,
          },
        };
      });
    }),
});
