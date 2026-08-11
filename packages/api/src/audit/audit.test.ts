import { describe, expect, test } from "bun:test";

import { withAuditedMutation } from "./with-audit";
import {
  AUDIT_ENTITY_TYPES,
  toAuditLogRow,
  writeAuditLog,
} from "./write-audit-log";

describe("toAuditLogRow", () => {
  test("fills null defaults for optional fields", () => {
    expect(
      toAuditLogRow({
        action: "student.create",
        entityType: "student",
      }),
    ).toEqual({
      userId: null,
      action: "student.create",
      entityType: "student",
      entityId: null,
      before: null,
      after: null,
      ip: null,
    });
  });

  test("keeps provided before/after payloads", () => {
    const row = toAuditLogRow({
      action: "question.update",
      entityType: "question",
      entityId: "q1",
      userId: "u1",
      ip: "127.0.0.1",
      before: { prompt: "old" },
      after: { prompt: "new" },
    });
    expect(row.before).toEqual({ prompt: "old" });
    expect(row.after).toEqual({ prompt: "new" });
    expect(row.entityId).toBe("q1");
  });
});

describe("AUDIT_ENTITY_TYPES", () => {
  test("includes glossario / ADR entities and not audit_log itself", () => {
    expect(AUDIT_ENTITY_TYPES).toContain("student");
    expect(AUDIT_ENTITY_TYPES).toContain("caseStudy");
    expect(AUDIT_ENTITY_TYPES).toContain("pdfGeneration");
    expect((AUDIT_ENTITY_TYPES as readonly string[]).includes("audit_log")).toBe(
      false,
    );
  });
});

describe("withAuditedMutation", () => {
  test("writes audit rows in the same transaction before returning", async () => {
    const inserted: unknown[] = [];
    let inTransaction = false;

    const fakeDb = {
      transaction: async <T>(
        fn: (tx: {
          insert: (table: unknown) => {
            values: (row: unknown) => Promise<void>;
          };
        }) => Promise<T>,
      ) => {
        inTransaction = true;
        const tx = {
          insert: (_table: unknown) => ({
            values: async (row: unknown) => {
              expect(inTransaction).toBe(true);
              inserted.push(row);
            },
          }),
        };
        const result = await fn(tx);
        inTransaction = false;
        return result;
      },
    };

    const result = await withAuditedMutation({
      db: fakeDb as never,
      userId: "user-1",
      ip: "10.0.0.1",
      run: async () => ({
        result: { id: "student-1" },
        audit: {
          action: "student.create",
          entityType: "student",
          entityId: "student-1",
          after: { name: "Ana" },
        },
      }),
    });

    expect(result).toEqual({ id: "student-1" });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      userId: "user-1",
      action: "student.create",
      entityType: "student",
      entityId: "student-1",
      after: { name: "Ana" },
      ip: "10.0.0.1",
    });
  });

  test("rejects mutations that return no audit entry", async () => {
    const fakeDb = {
      transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
    };

    await expect(
      withAuditedMutation({
        db: fakeDb as never,
        userId: "u1",
        ip: null,
        run: async () =>
          ({
            result: true,
            audit: [],
          }) as never,
      }),
    ).rejects.toThrow(/at least one audit entry/);
  });

  test("writeAuditLog is insert-only (uses tx.insert)", async () => {
    const calls: unknown[] = [];
    const tx = {
      insert: (table: unknown) => ({
        values: async (row: unknown) => {
          calls.push({ table, row });
        },
      }),
    };

    await writeAuditLog(tx as never, {
      action: "login",
      entityType: "session",
      userId: "u1",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      row: {
        action: "login",
        entityType: "session",
        userId: "u1",
      },
    });
  });
});
