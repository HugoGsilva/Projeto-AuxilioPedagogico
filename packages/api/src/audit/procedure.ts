import { db } from "@auxilio-pedagogico/db";
import { TRPCError } from "@trpc/server";

import { t } from "../trpc";
import { withAuditedMutation, type AuditedMutationResult } from "./with-audit";
import type { DbTransaction } from "./write-audit-log";

/**
 * Authenticated mutation procedure with `ctx.auditMutation`.
 * Use for every write path so audit_log is written in the same transaction.
 */
export const auditedProcedure = t.procedure.use(({ ctx, next, type }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }

  if (type !== "mutation") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "auditedProcedure só pode ser usado em mutations",
    });
  }

  const userId = ctx.session.user.id;
  const ip = ctx.ip;

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      auditMutation: <T>(
        run: (tx: DbTransaction) => Promise<AuditedMutationResult<T>>,
      ) =>
        withAuditedMutation({
          db,
          userId,
          ip,
          run,
        }),
    },
  });
});
