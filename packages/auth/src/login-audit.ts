import { auditLog } from "@auxilio-pedagogico/db/schema/domain";
import type { createDb } from "@auxilio-pedagogico/db";

type Db = ReturnType<typeof createDb>;

export type SessionLike = {
  id: string;
  userId: string;
  ipAddress?: string | null;
};

type RequestLike = {
  headers?: {
    get: (name: string) => string | null;
  };
};

/** Resolve client IP from Better Auth request context or session record. */
export function resolveLoginIp(
  session: SessionLike,
  ctx?: { request?: RequestLike } | null,
): string | null {
  const forwarded = ctx?.request?.headers?.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return (
    ctx?.request?.headers?.get("x-real-ip") ?? session.ipAddress ?? null
  );
}

/**
 * Append-only login audit (ADR-0004 / issue #5).
 * Called after Better Auth creates a session (successful sign-in).
 */
export async function recordLoginAudit(
  db: Pick<Db, "insert">,
  session: SessionLike,
  ctx?: { request?: RequestLike } | null,
): Promise<void> {
  await db.insert(auditLog).values({
    userId: session.userId,
    action: "login",
    entityType: "session",
    entityId: session.id,
    before: null,
    after: { sessionId: session.id },
    ip: resolveLoginIp(session, ctx),
  });
}
