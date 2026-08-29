import { db } from "@auxilio-pedagogico/db";
import { user } from "@auxilio-pedagogico/db/schema/auth";
import { auditLog } from "@auxilio-pedagogico/db/schema/domain";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, lt, lte, or } from "drizzle-orm";

import { actorFromSession, assertCan } from "../policy";
import { protectedProcedure, router } from "../trpc";
import {
  auditLogListInputSchema,
  parseAuditCursor,
  redactAuditRow,
  resolveAuditScope,
  schoolDayEnd,
  schoolDayStart,
  serializeAuditCursor,
} from "./audit-log-schemas";

/**
 * Consulta do audit_log (spec §5). Leitura NÃO é auditada — auditoria de
 * visualizações está fora do MVP (docs/mvp.md). Escopo por papel traduzido
 * para SQL (professora só as próprias linhas); redação do payload para
 * it_admin acontece por linha via canViewAuditEntry (ADR-0002).
 */
export const auditLogRouter = router({
  list: protectedProcedure
    .input(auditLogListInputSchema)
    .query(async ({ ctx, input }) => {
      const actor = actorFromSession(ctx.session.user);
      assertCan(actor.role, "viewAuditLog");

      const { pinUserId } = resolveAuditScope(actor, input.userId);
      const conditions = [];

      if (pinUserId) {
        conditions.push(eq(auditLog.userId, pinUserId));
      } else if (input.userId) {
        conditions.push(eq(auditLog.userId, input.userId));
      }

      if (input.entityType) {
        conditions.push(eq(auditLog.entityType, input.entityType));
      }
      if (input.action) {
        conditions.push(eq(auditLog.action, input.action));
      }
      // Dias no fuso da escola (UTC-3), não UTC — senão a noite local some.
      if (input.from) {
        conditions.push(gte(auditLog.createdAt, schoolDayStart(input.from)));
      }
      if (input.to) {
        conditions.push(lte(auditLog.createdAt, schoolDayEnd(input.to)));
      }

      if (input.cursor) {
        const cursor = parseAuditCursor(input.cursor);
        if (!cursor) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cursor de paginação inválido",
          });
        }
        conditions.push(
          or(
            lt(auditLog.createdAt, cursor.createdAt),
            and(
              eq(auditLog.createdAt, cursor.createdAt),
              lt(auditLog.id, cursor.id),
            ),
          ),
        );
      }

      const rows = await db
        .select({
          id: auditLog.id,
          createdAt: auditLog.createdAt,
          userId: auditLog.userId,
          actorName: user.name,
          action: auditLog.action,
          entityType: auditLog.entityType,
          entityId: auditLog.entityId,
          before: auditLog.before,
          after: auditLog.after,
        })
        .from(auditLog)
        .leftJoin(user, eq(auditLog.userId, user.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const page = rows.slice(0, input.limit);

      const items = page.map((row) => {
        const mapped = redactAuditRow(actor, row);
        if (!mapped) {
          /* O WHERE já escopa a visibilidade; uma linha não permitida aqui
           * seria bug de escopo — falhar alto em vez de vazar. */
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Falha de escopo na consulta de auditoria",
          });
        }
        return mapped;
      });

      const last = page.at(-1);
      return {
        items,
        nextCursor: hasMore && last ? serializeAuditCursor(last) : null,
      };
    }),

  /** Opções do filtro de usuário (a pedagoga não tem acesso a user.list). */
  userOptions: protectedProcedure.query(async ({ ctx }) => {
    const actor = actorFromSession(ctx.session.user);
    assertCan(actor.role, "viewAuditLog");

    if (actor.role === "teacher") {
      return [{ id: actor.id, name: ctx.session.user.name ?? "Você" }];
    }

    return db
      .select({ id: user.id, name: user.name })
      .from(user)
      .orderBy(asc(user.name));
  }),
});
