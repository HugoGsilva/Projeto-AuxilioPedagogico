import { auditLog } from "@auxilio-pedagogico/db/schema/domain";
import type { db as DbInstance } from "@auxilio-pedagogico/db";

export type Db = typeof DbInstance;
export type DbTransaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Domain entity types used in audit_log.entity_type (glossario). */
export const AUDIT_ENTITY_TYPES = [
  "user",
  "student",
  "studentAssignment",
  "question",
  "caseStudy",
  "answer",
  "freeReport",
  "pdfSettings",
  "pdfGeneration",
  "session",
  "invitation",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number] | (string & {});

export type AuditWriteInput = {
  action: string;
  entityType: AuditEntityType;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  userId?: string | null;
  ip?: string | null;
};

export type AuditLogRow = {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
};

/** Pure mapper — keeps row shape stable for tests and callers. */
export function toAuditLogRow(input: AuditWriteInput): AuditLogRow {
  return {
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ip: input.ip ?? null,
  };
}

/**
 * Append-only insert into `audit_log` (ADR-0004).
 * Must run inside the same DB transaction as the mutation it describes.
 * Never UPDATE/DELETE this table from application code.
 */
export async function writeAuditLog(
  tx: Pick<DbTransaction, "insert">,
  input: AuditWriteInput,
): Promise<void> {
  await tx.insert(auditLog).values(toAuditLogRow(input));
}
