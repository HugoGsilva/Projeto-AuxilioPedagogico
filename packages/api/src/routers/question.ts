import { db } from "@auxilio-pedagogico/db";
import { question } from "@auxilio-pedagogico/db/schema/domain";
import { TRPCError } from "@trpc/server";
import { asc, eq, inArray, isNull, max } from "drizzle-orm";
import { z } from "zod";

import { auditedProcedure } from "../audit";
import { assertCan, ROLES, type Actor, type Role } from "../policy";
import { protectedProcedure, router } from "../trpc";
import {
  questionCreateSchema,
  questionReorderSchema,
  questionUpdateSchema,
} from "./question-schemas";

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

const questionSelect = {
  id: question.id,
  prompt: question.prompt,
  type: question.type,
  section: question.section,
  sortOrder: question.sortOrder,
  required: question.required,
  active: question.active,
  options: question.options,
  createdAt: question.createdAt,
  updatedAt: question.updatedAt,
} as const;

function normalizeSectionInput(
  section: string | null | undefined,
): string | null | undefined {
  if (section === undefined) return undefined;
  if (section === null) return null;
  const trimmed = section.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const questionRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    assertCan(actorFromSession(ctx.session.user).role, "configureQuestions");

    return db
      .select(questionSelect)
      .from(question)
      .orderBy(
        asc(question.section),
        asc(question.sortOrder),
        asc(question.prompt),
      );
  }),

  create: auditedProcedure
    .input(questionCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "configureQuestions");

      return ctx.auditMutation(async (tx) => {
        let sortOrder = input.sortOrder;
        if (sortOrder === undefined) {
          const sectionFilter =
            input.section === null
              ? isNull(question.section)
              : eq(question.section, input.section);
          const [row] = await tx
            .select({ maxOrder: max(question.sortOrder) })
            .from(question)
            .where(sectionFilter);
          sortOrder = (row?.maxOrder ?? -1) + 1;
        }

        const [created] = await tx
          .insert(question)
          .values({
            prompt: input.prompt,
            type: input.type,
            section: input.section,
            sortOrder,
            required: input.required,
            options: input.options,
            active: true,
          })
          .returning(questionSelect);

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar pergunta",
          });
        }

        return {
          result: created,
          audit: {
            action: "question.create",
            entityType: "question",
            entityId: created.id,
            after: created,
          },
        };
      });
    }),

  update: auditedProcedure
    .input(questionUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "configureQuestions");

      return ctx.auditMutation(async (tx) => {
        const [before] = await tx
          .select(questionSelect)
          .from(question)
          .where(eq(question.id, input.id))
          .limit(1);

        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pergunta não encontrada",
          });
        }

        const [after] = await tx
          .update(question)
          .set({
            prompt: input.prompt,
            type: input.type,
            section: input.section,
            ...(input.sortOrder !== undefined
              ? { sortOrder: input.sortOrder }
              : {}),
            required: input.required,
            options: input.options,
          })
          .where(eq(question.id, input.id))
          .returning(questionSelect);

        return {
          result: after,
          audit: {
            action: "question.update",
            entityType: "question",
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
      assertCan(actor.role, "configureQuestions");

      return ctx.auditMutation(async (tx) => {
        const [before] = await tx
          .select(questionSelect)
          .from(question)
          .where(eq(question.id, input.id))
          .limit(1);

        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pergunta não encontrada",
          });
        }

        const [after] = await tx
          .update(question)
          .set({ active: input.active })
          .where(eq(question.id, input.id))
          .returning(questionSelect);

        return {
          result: after,
          audit: {
            action: input.active
              ? "question.activate"
              : "question.deactivate",
            entityType: "question",
            entityId: input.id,
            before,
            after: after ?? null,
          },
        };
      });
    }),

  reorder: auditedProcedure
    .input(questionReorderSchema)
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "configureQuestions");

      return ctx.auditMutation(async (tx) => {
        const ids = input.items.map((item) => item.id);
        const beforeAll = await tx
          .select(questionSelect)
          .from(question)
          .where(inArray(question.id, ids));

        if (beforeAll.length !== ids.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Uma ou mais perguntas não foram encontradas",
          });
        }

        const afterAll = [];
        for (const item of input.items) {
          const section = normalizeSectionInput(item.section);
          const [after] = await tx
            .update(question)
            .set({
              sortOrder: item.sortOrder,
              ...(section !== undefined ? { section } : {}),
            })
            .where(eq(question.id, item.id))
            .returning(questionSelect);

          if (after) afterAll.push(after);
        }

        return {
          result: afterAll,
          audit: {
            action: "question.reorder",
            entityType: "question",
            entityId: ids.join(","),
            before: { items: beforeAll },
            after: { items: afterAll },
          },
        };
      });
    }),
});
