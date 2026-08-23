import { TRPCError } from "@trpc/server";

import { can, type Permission, type Role } from "./permissions";

export type Actor = {
  id: string;
  role: Role;
};

/** Student data access: director/pedagogue all; teacher only assigned; it_admin never. */
export function canAccessStudent(
  actor: Actor,
  input: { studentId: string; assignedStudentIds: ReadonlySet<string> | readonly string[] },
): boolean {
  if (actor.role === "it_admin") return false;
  if (actor.role === "director" || actor.role === "pedagogue") return true;
  if (actor.role === "teacher") {
    const assigned =
      input.assignedStudentIds instanceof Set
        ? input.assignedStudentIds
        : new Set(input.assignedStudentIds);
    return assigned.has(input.studentId);
  }
  return false;
}

export function canViewOrEditCaseStudy(
  actor: Actor,
  permission: "viewCaseStudy" | "editCaseStudy",
  input: { studentId: string; assignedStudentIds: ReadonlySet<string> | readonly string[] },
): boolean {
  return can(actor.role, permission) && canAccessStudent(actor, input);
}

/**
 * Audit log visibility (ADR-0002):
 * - director / pedagogue: all entries
 * - it_admin: all entries, but student-related before/after must be redacted
 * - teacher: only own actions
 */
export type AuditViewDecision = {
  allowed: boolean;
  /** When true, strip `before`/`after` (and similar payloads) before returning. */
  redactPayload: boolean;
};

const STUDENT_RELATED_ENTITY_TYPES = new Set([
  "student",
  "studentAssignment",
  "caseStudy",
  "answer",
  "freeReport",
  "pdfGeneration",
]);

export function canViewAuditEntry(
  actor: Actor,
  entry: { userId: string | null; entityType: string },
): AuditViewDecision {
  if (!can(actor.role, "viewAuditLog")) {
    return { allowed: false, redactPayload: false };
  }

  if (actor.role === "teacher") {
    return {
      allowed: entry.userId === actor.id,
      redactPayload: false,
    };
  }

  if (actor.role === "it_admin") {
    return {
      allowed: true,
      redactPayload: STUDENT_RELATED_ENTITY_TYPES.has(entry.entityType),
    };
  }

  // director, pedagogue
  return { allowed: true, redactPayload: false };
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permissão negada: ${permission}`,
    });
  }
}

export function assertCanAccessStudent(
  actor: Actor,
  input: { studentId: string; assignedStudentIds: ReadonlySet<string> | readonly string[] },
): void {
  if (!canAccessStudent(actor, input)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Permissão negada: acesso ao aluno",
    });
  }
}

export function assertCanViewOrEditCaseStudy(
  actor: Actor,
  permission: "viewCaseStudy" | "editCaseStudy",
  input: { studentId: string; assignedStudentIds: ReadonlySet<string> | readonly string[] },
): void {
  if (!canViewOrEditCaseStudy(actor, permission, input)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Permissão negada: acesso ao estudo de caso",
    });
  }
}
