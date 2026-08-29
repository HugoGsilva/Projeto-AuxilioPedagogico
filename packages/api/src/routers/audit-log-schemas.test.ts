import { describe, expect, test } from "bun:test";

import {
  auditLogListInputSchema,
  parseAuditCursor,
  redactAuditRow,
  resolveAuditScope,
  schoolDayEnd,
  schoolDayStart,
  serializeAuditCursor,
  type AuditListRow,
} from "./audit-log-schemas";

function row(overrides: Partial<AuditListRow> = {}): AuditListRow {
  return {
    id: "a1",
    createdAt: new Date("2026-08-29T12:00:00Z"),
    userId: "u1",
    actorName: "Alguém",
    action: "student.update",
    entityType: "student",
    entityId: "s1",
    before: { name: "Ana" },
    after: { name: "Ana Clara" },
    ...overrides,
  };
}

describe("resolveAuditScope", () => {
  test("professora presa ao próprio userId; demais sem pino", () => {
    expect(resolveAuditScope({ id: "t1", role: "teacher" }).pinUserId).toBe(
      "t1",
    );
    expect(resolveAuditScope({ id: "d1", role: "director" }).pinUserId).toBe(
      null,
    );
    expect(resolveAuditScope({ id: "p1", role: "pedagogue" }).pinUserId).toBe(
      null,
    );
    expect(resolveAuditScope({ id: "i1", role: "it_admin" }).pinUserId).toBe(
      null,
    );
  });

  test("professora forçando userId alheio recebe FORBIDDEN", () => {
    expect(() =>
      resolveAuditScope({ id: "t1", role: "teacher" }, "outro-usuario"),
    ).toThrow(/Permissão negada/);
    // O próprio id é aceito; diretora filtra qualquer usuário.
    expect(
      resolveAuditScope({ id: "t1", role: "teacher" }, "t1").pinUserId,
    ).toBe("t1");
    expect(
      resolveAuditScope({ id: "d1", role: "director" }, "qualquer").pinUserId,
    ).toBe(null);
  });
});

describe("schoolDayStart/schoolDayEnd", () => {
  test("interpreta o dia no fuso da escola (UTC-3)", () => {
    expect(schoolDayStart("2026-08-29").toISOString()).toBe(
      "2026-08-29T03:00:00.000Z",
    );
    expect(schoolDayEnd("2026-08-29").toISOString()).toBe(
      "2026-08-30T02:59:59.999Z",
    );
  });
});

describe("redactAuditRow", () => {
  test("it_admin: entidade de aluno vem sem before/after e marcada", () => {
    const result = redactAuditRow({ id: "i1", role: "it_admin" }, row());
    expect(result?.redacted).toBe(true);
    expect(result?.before).toBeNull();
    expect(result?.after).toBeNull();
  });

  test("it_admin: entidade de staff/config mantém o payload", () => {
    const result = redactAuditRow(
      { id: "i1", role: "it_admin" },
      row({ entityType: "user", action: "user.update" }),
    );
    expect(result?.redacted).toBe(false);
    expect(result?.after).toEqual({ name: "Ana Clara" });
  });

  test("diretora e pedagoga nunca são redigidas", () => {
    for (const role of ["director", "pedagogue"] as const) {
      const result = redactAuditRow({ id: "x", role }, row());
      expect(result?.redacted).toBe(false);
      expect(result?.before).toEqual({ name: "Ana" });
    }
  });

  test("professora: linha própria passa, linha alheia é descartada", () => {
    const own = redactAuditRow({ id: "u1", role: "teacher" }, row());
    expect(own?.redacted).toBe(false);
    const other = redactAuditRow({ id: "u2", role: "teacher" }, row());
    expect(other).toBeNull();
  });
});

describe("cursor", () => {
  test("round-trip serialize/parse", () => {
    const createdAt = new Date("2026-08-29T12:34:56.789Z");
    const cursor = serializeAuditCursor({ createdAt, id: "abc" });
    const parsed = parseAuditCursor(cursor);
    expect(parsed?.id).toBe("abc");
    expect(parsed?.createdAt.getTime()).toBe(createdAt.getTime());
  });

  test("cursor inválido retorna null", () => {
    expect(parseAuditCursor("sem-separador")).toBeNull();
    expect(parseAuditCursor("data-invalida|id")).toBeNull();
    expect(parseAuditCursor("2026-08-29T12:00:00Z|")).toBeNull();
  });
});

describe("auditLogListInputSchema", () => {
  test("aceita filtros válidos e aplica default de limit", () => {
    const parsed = auditLogListInputSchema.parse({
      entityType: "student",
      action: "student.update",
      from: "2026-08-01",
    });
    expect(parsed.limit).toBe(50);
    expect(parsed.from).toBe("2026-08-01");
  });

  test("rejeita entityType/action desconhecidos, data e limit inválidos", () => {
    expect(() =>
      auditLogListInputSchema.parse({ entityType: "banana" }),
    ).toThrow();
    expect(() =>
      auditLogListInputSchema.parse({ action: "acao.inexistente" }),
    ).toThrow();
    expect(() => auditLogListInputSchema.parse({ from: "29/08/2026" })).toThrow();
    expect(() => auditLogListInputSchema.parse({ limit: 1000 })).toThrow();
  });
});
