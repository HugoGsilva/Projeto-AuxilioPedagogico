import { db } from "@auxilio-pedagogico/db";
import { account, user } from "@auxilio-pedagogico/db/schema/auth";
import { invitation } from "@auxilio-pedagogico/db/schema/domain";
import { env } from "@auxilio-pedagogico/env/server";
import { TRPCError } from "@trpc/server";
import { hashPassword } from "better-auth/crypto";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { withAuditedMutation } from "../audit";
import { actorFromSession, assertCan } from "../policy";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import {
  buildInviteUrl,
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_MS,
} from "./invitation-token";

const roleSchema = z.enum(["director", "it_admin", "pedagogue", "teacher"]);

const invitationSelect = {
  id: invitation.id,
  email: invitation.email,
  name: invitation.name,
  role: invitation.role,
  status: invitation.status,
  expiresAt: invitation.expiresAt,
  createdAt: invitation.createdAt,
} as const;

/** Erro único e genérico para todo caminho de aceite inválido (sem enumeração). */
function genericInviteError(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Convite inválido ou expirado.",
  });
}

/** Cria um convite (revoga o pending anterior do mesmo e-mail) e devolve o link. */
async function issueInvitation(
  actorId: string,
  ip: string | null,
  data: { name: string; email: string; role: z.infer<typeof roleSchema> },
) {
  const email = data.email.toLowerCase();
  const { raw, hash } = generateInviteToken();

  const created = await withAuditedMutation({
    db,
    userId: actorId,
    ip,
    run: async (tx) => {
      const [existingUser] = await tx
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe um usuário com este e-mail",
        });
      }

      // Reconvite invalida o link anterior (mantém 1 pending por e-mail).
      const [revoked] = await tx
        .update(invitation)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(
          and(eq(invitation.email, email), eq(invitation.status, "pending")),
        )
        .returning({ id: invitation.id });

      const [row] = await tx
        .insert(invitation)
        .values({
          email,
          name: data.name.trim(),
          role: data.role,
          tokenHash: hash,
          status: "pending",
          invitedById: actorId,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        })
        .returning(invitationSelect);

      if (!row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Falha ao criar o convite",
        });
      }

      const audit = [];
      if (revoked) {
        audit.push({
          action: "invitation.revoke" as const,
          entityType: "invitation" as const,
          entityId: revoked.id,
          after: { status: "revoked", reason: "reconvite" },
        });
      }
      audit.push({
        action: "invitation.create" as const,
        entityType: "invitation" as const,
        entityId: row.id,
        after: { email: row.email, role: row.role, status: row.status },
      });

      return { result: row, audit };
    },
  });

  return { invitation: created, inviteUrl: buildInviteUrl(env.CORS_ORIGIN, raw) };
}

export const invitationRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(2, "Nome muito curto"),
        email: z.email("E-mail inválido"),
        role: roleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageUsers");
      return issueInvitation(actor.id, ctx.ip, input);
    }),

  regenerate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageUsers");

      const [existing] = await db
        .select({
          name: invitation.name,
          email: invitation.email,
          role: invitation.role,
        })
        .from(invitation)
        .where(eq(invitation.id, input.id))
        .limit(1);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado",
        });
      }
      return issueInvitation(actor.id, ctx.ip, existing);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const actor = actorFromSession(ctx.session.user);
    assertCan(actor.role, "manageUsers");
    return db
      .select(invitationSelect)
      .from(invitation)
      .where(eq(invitation.status, "pending"))
      .orderBy(asc(invitation.createdAt));
  }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "manageUsers");

      return withAuditedMutation({
        db,
        userId: actor.id,
        ip: ctx.ip,
        run: async (tx) => {
          const [row] = await tx
            .update(invitation)
            .set({ status: "revoked", revokedAt: new Date() })
            .where(
              and(
                eq(invitation.id, input.id),
                eq(invitation.status, "pending"),
              ),
            )
            .returning({ id: invitation.id, email: invitation.email });
          if (!row) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Convite não encontrado ou já utilizado",
            });
          }
          return {
            result: { id: row.id },
            audit: {
              action: "invitation.revoke" as const,
              entityType: "invitation" as const,
              entityId: row.id,
              after: { status: "revoked" },
            },
          };
        },
      });
    }),

  /** Preview público da tela de aceite — só e-mail/papel/nome, erro genérico. */
  preview: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const [row] = await db
        .select({
          email: invitation.email,
          role: invitation.role,
          name: invitation.name,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
        })
        .from(invitation)
        .where(eq(invitation.tokenHash, hashInviteToken(input.token)))
        .limit(1);
      if (!row || row.status !== "pending" || row.expiresAt < new Date()) {
        genericInviteError();
      }
      return { email: row.email, role: row.role, name: row.name };
    }),

  /** Aceite público: cria a conta e devolve o e-mail (o cliente faz o sign-in). */
  accept: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        name: z.string().trim().min(2, "Nome muito curto"),
        password: z
          .string()
          .min(8, "Senha deve ter pelo menos 8 caracteres"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tokenHash = hashInviteToken(input.token);
      const newUserId = crypto.randomUUID();
      const passwordHash = await hashPassword(input.password);

      const result = await withAuditedMutation({
        db,
        userId: newUserId,
        ip: ctx.ip,
        run: async (tx) => {
          const [invite] = await tx
            .select({
              id: invitation.id,
              email: invitation.email,
              role: invitation.role,
              status: invitation.status,
              expiresAt: invitation.expiresAt,
            })
            .from(invitation)
            .where(eq(invitation.tokenHash, tokenHash))
            .limit(1);
          if (
            !invite ||
            invite.status !== "pending" ||
            invite.expiresAt < new Date()
          ) {
            genericInviteError();
          }

          const [clash] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, invite.email))
            .limit(1);
          if (clash) genericInviteError();

          // Fecha o convite de forma atômica (uso único, à prova de corrida).
          const consumed = await tx
            .update(invitation)
            .set({
              status: "accepted",
              acceptedAt: new Date(),
              acceptedUserId: newUserId,
            })
            .where(
              and(
                eq(invitation.id, invite.id),
                eq(invitation.status, "pending"),
              ),
            )
            .returning({ id: invitation.id });
          if (consumed.length === 0) genericInviteError();

          const now = new Date();
          const [createdUser] = await tx
            .insert(user)
            .values({
              id: newUserId,
              name: input.name.trim(),
              email: invite.email,
              emailVerified: true,
              role: invite.role,
              active: true,
            })
            .returning({
              id: user.id,
              email: user.email,
              role: user.role,
            });
          if (!createdUser) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Falha ao criar a conta",
            });
          }

          await tx.insert(account).values({
            id: crypto.randomUUID(),
            accountId: newUserId,
            providerId: "credential",
            userId: newUserId,
            password: passwordHash,
            createdAt: now,
            updatedAt: now,
          });

          return {
            result: { email: createdUser.email },
            audit: [
              {
                action: "invitation.accept" as const,
                entityType: "invitation" as const,
                entityId: invite.id,
                before: { status: "pending" },
                after: { status: "accepted", acceptedUserId: newUserId },
              },
              {
                action: "user.create" as const,
                entityType: "user" as const,
                entityId: newUserId,
                after: {
                  id: newUserId,
                  email: createdUser.email,
                  role: createdUser.role,
                  active: true,
                },
              },
            ],
          };
        },
      });

      // Cliente faz o sign-in em seguida com a senha recém-definida.
      return { email: result.email };
    }),
});
