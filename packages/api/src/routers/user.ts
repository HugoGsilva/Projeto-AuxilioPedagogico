import { db } from "@auxilio-pedagogico/db";
import { account, session, user } from "@auxilio-pedagogico/db/schema/auth";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { assertCan, ROLES, type Role } from "../policy";
import { auditedProcedure } from "../audit";
import { protectedProcedure, router } from "../trpc";

const roleSchema = z.enum([
  "director",
  "it_admin",
  "pedagogue",
  "teacher",
]);

function actorRole(sessionUser: { role?: string | null }): Role {
  const role = sessionUser.role;
  if (!role || !ROLES.includes(role as Role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Perfil de usuário inválido",
    });
  }
  return role as Role;
}

export const userRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    assertCan(actorRole(ctx.session.user), "manageUsers");

    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(asc(user.name));

    return rows;
  }),

  create: auditedProcedure
    .input(
      z.object({
        name: z.string().trim().min(2, "Nome muito curto"),
        email: z.email("E-mail inválido"),
        password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(actorRole(ctx.session.user), "manageUsers");

      return ctx.auditMutation(async (tx) => {
        const existing = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, input.email.toLowerCase()))
          .limit(1);

        if (existing[0]) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe um usuário com este e-mail",
          });
        }

        const id = crypto.randomUUID();
        const passwordHash = await hashPassword(input.password);
        const now = new Date();

        const [created] = await tx
          .insert(user)
          .values({
            id,
            name: input.name.trim(),
            email: input.email.toLowerCase(),
            emailVerified: true,
            role: input.role,
            active: true,
          })
          .returning({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
          });

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha ao criar usuário",
          });
        }

        await tx.insert(account).values({
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          userId: id,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });

        return {
          result: created,
          audit: {
            action: "user.create",
            entityType: "user",
            entityId: created.id,
            after: created,
          },
        };
      });
    }),

  update: auditedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(2).optional(),
        role: roleSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(actorRole(ctx.session.user), "manageUsers");

      if (input.id === ctx.session.user.id && input.role) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível alterar o próprio perfil",
        });
      }

      return ctx.auditMutation(async (tx) => {
        const [before] = await tx
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
          })
          .from(user)
          .where(eq(user.id, input.id))
          .limit(1);

        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        const [after] = await tx
          .update(user)
          .set({
            ...(input.name ? { name: input.name.trim() } : {}),
            ...(input.role ? { role: input.role } : {}),
          })
          .where(eq(user.id, input.id))
          .returning({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
          });

        return {
          result: after,
          audit: {
            action: "user.update",
            entityType: "user",
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
        id: z.string().min(1),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(actorRole(ctx.session.user), "manageUsers");

      if (input.id === ctx.session.user.id && input.active === false) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível desativar a própria conta",
        });
      }

      return ctx.auditMutation(async (tx) => {
        const [before] = await tx
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
          })
          .from(user)
          .where(eq(user.id, input.id))
          .limit(1);

        if (!before) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        const [after] = await tx
          .update(user)
          .set({ active: input.active })
          .where(eq(user.id, input.id))
          .returning({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
          });

        if (input.active === false) {
          await tx.delete(session).where(eq(session.userId, input.id));
        }

        return {
          result: after,
          audit: {
            action: input.active ? "user.activate" : "user.deactivate",
            entityType: "user",
            entityId: input.id,
            before,
            after: after ?? null,
          },
        };
      });
    }),
});
