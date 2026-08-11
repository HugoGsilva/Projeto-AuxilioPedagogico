import type { Db, DbTransaction } from "./write-audit-log";
import { writeAuditLog, type AuditWriteInput } from "./write-audit-log";

export type AuditedMutationResult<T> = {
  result: T;
  /** One or more audit entries written in the same transaction. */
  audit: AuditWriteInput | AuditWriteInput[];
};

/**
 * Runs a mutation callback inside a DB transaction and writes `audit_log`
 * rows before commit (ADR-0004). Prefer this helper (or `ctx.auditMutation`)
 * for every tRPC mutation that changes data.
 */
export async function withAuditedMutation<T>(opts: {
  db: Pick<Db, "transaction">;
  userId: string | null;
  ip: string | null;
  run: (tx: DbTransaction) => Promise<AuditedMutationResult<T>>;
}): Promise<T> {
  return opts.db.transaction(async (tx) => {
    const { result, audit } = await opts.run(tx);
    const entries = Array.isArray(audit) ? audit : [audit];
    if (entries.length === 0) {
      throw new Error(
        "withAuditedMutation: mutation must return at least one audit entry",
      );
    }
    for (const entry of entries) {
      await writeAuditLog(tx, {
        ...entry,
        userId: entry.userId ?? opts.userId,
        ip: entry.ip ?? opts.ip,
      });
    }
    return result;
  });
}
