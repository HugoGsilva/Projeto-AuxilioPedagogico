import { describe, expect, test } from "bun:test";

import { TRPCError } from "@trpc/server";

import {
  assertCanViewOrEditCaseStudy,
  can,
  canAccessStudent,
  canViewAuditEntry,
  canViewOrEditCaseStudy,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  type Permission,
  type Role,
} from "./index";

/** Expected matrix — single source of truth for the ADR-0002 defaults under test. */
const EXPECTED: Record<Role, Record<Permission, boolean>> = {
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

describe("ROLE_PERMISSIONS matrix (ADR-0002)", () => {
  test("covers every role and permission", () => {
    expect(ROLES).toEqual(["director", "it_admin", "pedagogue", "teacher"]);
    for (const role of ROLES) {
      for (const permission of PERMISSIONS) {
        expect(ROLE_PERMISSIONS[role][permission]).toBe(EXPECTED[role][permission]);
        expect(can(role, permission)).toBe(EXPECTED[role][permission]);
      }
    }
  });

  test("it_admin never gets student-data capabilities", () => {
    expect(can("it_admin", "manageStudents")).toBe(false);
    expect(can("it_admin", "manageAssignments")).toBe(false);
    expect(can("it_admin", "viewCaseStudy")).toBe(false);
    expect(can("it_admin", "editCaseStudy")).toBe(false);
    expect(can("it_admin", "generatePdf")).toBe(false);
  });

  test("teacher cannot generate PDF or manage config/users", () => {
    expect(can("teacher", "generatePdf")).toBe(false);
    expect(can("teacher", "manageUsers")).toBe(false);
    expect(can("teacher", "configureQuestions")).toBe(false);
    expect(can("teacher", "configurePdfSettings")).toBe(false);
  });

  test("pedagogue can configure questions and generate PDF", () => {
    expect(can("pedagogue", "configureQuestions")).toBe(true);
    expect(can("pedagogue", "generatePdf")).toBe(true);
    expect(can("pedagogue", "manageUsers")).toBe(false);
  });
});

describe("canAccessStudent", () => {
  const studentId = "student-1";
  const assigned = new Set([studentId, "student-2"]);

  test("director and pedagogue access any student", () => {
    expect(
      canAccessStudent(
        { id: "d1", role: "director" },
        { studentId: "other", assignedStudentIds: [] },
      ),
    ).toBe(true);
    expect(
      canAccessStudent(
        { id: "p1", role: "pedagogue" },
        { studentId: "other", assignedStudentIds: [] },
      ),
    ).toBe(true);
  });

  test("it_admin never accesses students", () => {
    expect(
      canAccessStudent(
        { id: "ti", role: "it_admin" },
        { studentId, assignedStudentIds: assigned },
      ),
    ).toBe(false);
  });

  test("teacher only when assigned", () => {
    const teacher = { id: "t1", role: "teacher" as const };
    expect(canAccessStudent(teacher, { studentId, assignedStudentIds: assigned })).toBe(
      true,
    );
    expect(
      canAccessStudent(teacher, {
        studentId: "not-assigned",
        assignedStudentIds: assigned,
      }),
    ).toBe(false);
  });
});

describe("canViewOrEditCaseStudy", () => {
  test("teacher needs assignment even though matrix allows view/edit", () => {
    const teacher = { id: "t1", role: "teacher" as const };
    expect(
      canViewOrEditCaseStudy(teacher, "viewCaseStudy", {
        studentId: "s1",
        assignedStudentIds: ["s1"],
      }),
    ).toBe(true);
    expect(
      canViewOrEditCaseStudy(teacher, "editCaseStudy", {
        studentId: "s1",
        assignedStudentIds: [],
      }),
    ).toBe(false);
  });

  test("it_admin blocked even with assignment list", () => {
    expect(
      canViewOrEditCaseStudy(
        { id: "ti", role: "it_admin" },
        "viewCaseStudy",
        { studentId: "s1", assignedStudentIds: ["s1"] },
      ),
    ).toBe(false);
    expect(
      canViewOrEditCaseStudy(
        { id: "ti", role: "it_admin" },
        "editCaseStudy",
        { studentId: "s1", assignedStudentIds: ["s1"] },
      ),
    ).toBe(false);
  });

  test("listActive permission is viewCaseStudy so it_admin is blocked", () => {
    expect(can("it_admin", "viewCaseStudy")).toBe(false);
    expect(can("teacher", "viewCaseStudy")).toBe(true);
    expect(can("director", "viewCaseStudy")).toBe(true);
    expect(can("pedagogue", "viewCaseStudy")).toBe(true);
  });
});

describe("assertCanViewOrEditCaseStudy", () => {
  test("throws FORBIDDEN in Portuguese for it_admin", () => {
    try {
      assertCanViewOrEditCaseStudy(
        { id: "ti", role: "it_admin" },
        "viewCaseStudy",
        { studentId: "s1", assignedStudentIds: ["s1"] },
      );
      throw new Error("expected FORBIDDEN");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
      expect((error as TRPCError).message).toBe(
        "Permissão negada: acesso ao estudo de caso",
      );
    }
  });

  test("throws FORBIDDEN for teacher without assignment", () => {
    try {
      assertCanViewOrEditCaseStudy(
        { id: "t1", role: "teacher" },
        "editCaseStudy",
        { studentId: "s1", assignedStudentIds: ["other"] },
      );
      throw new Error("expected FORBIDDEN");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  test("allows teacher when assigned", () => {
    expect(() =>
      assertCanViewOrEditCaseStudy(
        { id: "t1", role: "teacher" },
        "editCaseStudy",
        { studentId: "s1", assignedStudentIds: ["s1"] },
      ),
    ).not.toThrow();
  });

  test("allows director without an assignment list", () => {
    expect(() =>
      assertCanViewOrEditCaseStudy(
        { id: "d1", role: "director" },
        "editCaseStudy",
        { studentId: "s1", assignedStudentIds: [] },
      ),
    ).not.toThrow();
    expect(
      canViewOrEditCaseStudy(
        { id: "d1", role: "director" },
        "viewCaseStudy",
        { studentId: "any-student", assignedStudentIds: [] },
      ),
    ).toBe(true);
  });
});

describe("canViewAuditEntry", () => {
  test("teacher sees only own actions", () => {
    const teacher = { id: "t1", role: "teacher" as const };
    expect(
      canViewAuditEntry(teacher, { userId: "t1", entityType: "question" }),
    ).toEqual({ allowed: true, redactPayload: false });
    expect(
      canViewAuditEntry(teacher, { userId: "other", entityType: "question" }),
    ).toEqual({ allowed: false, redactPayload: false });
  });

  test("it_admin sees all but redacts student-related payloads", () => {
    const ti = { id: "ti", role: "it_admin" as const };
    expect(
      canViewAuditEntry(ti, { userId: "anyone", entityType: "student" }),
    ).toEqual({ allowed: true, redactPayload: true });
    expect(
      canViewAuditEntry(ti, { userId: "anyone", entityType: "caseStudy" }),
    ).toEqual({ allowed: true, redactPayload: true });
    expect(
      canViewAuditEntry(ti, { userId: "anyone", entityType: "pdfGeneration" }),
    ).toEqual({ allowed: true, redactPayload: true });
    expect(
      canViewAuditEntry(ti, { userId: "anyone", entityType: "user" }),
    ).toEqual({ allowed: true, redactPayload: false });
    expect(
      canViewAuditEntry(ti, { userId: "anyone", entityType: "pdfSettings" }),
    ).toEqual({ allowed: true, redactPayload: false });
  });

  test("director and pedagogue see full audit entries", () => {
    for (const role of ["director", "pedagogue"] as const) {
      expect(
        canViewAuditEntry(
          { id: "u1", role },
          { userId: "other", entityType: "student" },
        ),
      ).toEqual({ allowed: true, redactPayload: false });
    }
  });
});
