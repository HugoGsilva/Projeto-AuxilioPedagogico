import { TRPCError } from "@trpc/server";
import { z } from "zod";

/* Import direto (não pelo barrel ../audit): o barrel puxa with-audit → db →
 * validação de env, o que quebraria os testes puros deste módulo. */
import { AUDIT_ENTITY_TYPES } from "../audit/write-audit-log";
import { canViewAuditEntry, type Actor } from "../policy";

/** Actions gravadas pelos routers/login — fonte do filtro "tipo de ação". */
export const AUDIT_ACTIONS = [
  "login",
  "user.create",
  "user.update",
  "user.activate",
  "user.deactivate",
  "student.create",
  "student.update",
  "student.activate",
  "student.deactivate",
  "studentAssignment.create",
  "studentAssignment.remove",
  "question.create",
  "question.update",
  "question.activate",
  "question.deactivate",
  "question.reorder",
  "caseStudy.create",
  "answer.upsert",
  "freeReport.update",
  "pdfSettings.update",
  "pdfGeneration.create",
  "invitation.create",
  "invitation.accept",
  "invitation.revoke",
] as const;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const auditLogListInputSchema = z.object({
  userId: z.string().min(1).optional(),
  entityType: z
    .string()
    .refine(
      (value) => (AUDIT_ENTITY_TYPES as readonly string[]).includes(value),
      "Entidade inválida",
    )
    .optional(),
  action: z
    .string()
    .refine(
      (value) => (AUDIT_ACTIONS as readonly string[]).includes(value),
      "Tipo de ação inválido",
    )
    .optional(),
  /** Dia local da escola (AAAA-MM-DD), interpretado em UTC-3. */
  from: z.string().regex(DATE_ONLY, "Data inválida").optional(),
  to: z.string().regex(DATE_ONLY, "Data inválida").optional(),
  limit: z.number().int().min(1).max(100).default(50),
  /** Keyset: `${createdAt ISO}|${id}` da última linha da página anterior. */
  cursor: z.string().optional(),
});

/**
 * Fuso da escola (America/Sao_Paulo, sem horário de verão desde 2019): o
 * filtro "De/Até" é por dia LOCAL — meia-noite UTC cortaria a noite local.
 */
const SCHOOL_UTC_OFFSET = "-03:00";

export function schoolDayStart(date: string): Date {
  return new Date(`${date}T00:00:00.000${SCHOOL_UTC_OFFSET}`);
}

export function schoolDayEnd(date: string): Date {
  return new Date(`${date}T23:59:59.999${SCHOOL_UTC_OFFSET}`);
}

/**
 * Escopo de LINHA por papel: só a professora é presa ao próprio userId.
 * Professora forçando userId alheio (só possível via API direta) → FORBIDDEN.
 */
export function resolveAuditScope(
  actor: Actor,
  requestedUserId?: string,
): { pinUserId: string | null } {
  if (actor.role !== "teacher") return { pinUserId: null };
  if (requestedUserId && requestedUserId !== actor.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Permissão negada: ações de outros usuários",
    });
  }
  return { pinUserId: actor.id };
}

export type AuditListRow = {
  id: string;
  createdAt: Date;
  userId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

/**
 * Defesa em profundidade: aplica canViewAuditEntry por linha. Linha não
 * permitida retorna null (o WHERE já deveria tê-la excluído); redação zera
 * before/after e marca `redacted` (it_admin × entidades de aluno, ADR-0002).
 */
export function redactAuditRow(
  actor: Actor,
  row: AuditListRow,
): (AuditListRow & { redacted: boolean }) | null {
  const decision = canViewAuditEntry(actor, {
    userId: row.userId,
    entityType: row.entityType,
  });
  if (!decision.allowed) return null;
  if (decision.redactPayload) {
    return { ...row, before: null, after: null, redacted: true };
  }
  return { ...row, redacted: false };
}

export function parseAuditCursor(
  cursor: string,
): { createdAt: Date; id: string } | null {
  const separator = cursor.indexOf("|");
  if (separator < 0) return null;
  const createdAt = new Date(cursor.slice(0, separator));
  const id = cursor.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || id.length === 0) return null;
  return { createdAt, id };
}

export function serializeAuditCursor(row: {
  createdAt: Date;
  id: string;
}): string {
  return `${row.createdAt.toISOString()}|${row.id}`;
}
