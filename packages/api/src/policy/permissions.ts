/** Fixed roles — ADR-0002 / glossario. */
export type Role = "director" | "it_admin" | "pedagogue" | "teacher";

export const ROLES: readonly Role[] = [
  "director",
  "it_admin",
  "pedagogue",
  "teacher",
] as const;

/**
 * Capability keys for the fixed role matrix (ADR-0002).
 * Student-scoped checks use helpers in `access.ts`, not this boolean matrix alone.
 */
export const PERMISSIONS = [
  "manageUsers",
  "manageStudents",
  "manageAssignments",
  "configureQuestions",
  "viewCaseStudy",
  "editCaseStudy",
  "generatePdf",
  "configurePdfSettings",
  "viewAuditLog",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role × permission matrix.
 * `true` = allowed without student scope; student scope is enforced separately
 * for teacher via `canAccessStudent`.
 *
 * ADR-0002 defaults:
 * - it_admin: no student/case-study data
 * - teacher: case-study/student only when assigned
 * - teacher: no PDF generation
 * - pedagogue: can configure questions; no user management; can generate PDF
 */
export const ROLE_PERMISSIONS: Record<Role, Record<Permission, boolean>> = {
  director: {
    manageUsers: true,
    manageStudents: true,
    manageAssignments: true,
    configureQuestions: true,
    viewCaseStudy: true,
    editCaseStudy: true,
    generatePdf: true,
    configurePdfSettings: true,
    viewAuditLog: true,
  },
  it_admin: {
    manageUsers: true,
    manageStudents: false,
    manageAssignments: false,
    configureQuestions: true,
    viewCaseStudy: false,
    editCaseStudy: false,
    generatePdf: false,
    configurePdfSettings: true,
    viewAuditLog: true,
  },
  pedagogue: {
    manageUsers: false,
    manageStudents: true,
    manageAssignments: true,
    configureQuestions: true,
    viewCaseStudy: true,
    editCaseStudy: true,
    generatePdf: true,
    configurePdfSettings: false,
    viewAuditLog: true,
  },
  teacher: {
    manageUsers: false,
    manageStudents: false,
    manageAssignments: false,
    configureQuestions: false,
    viewCaseStudy: true,
    editCaseStudy: true,
    generatePdf: false,
    configurePdfSettings: false,
    viewAuditLog: true,
  },
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role][permission] === true;
}
