import { relations } from "drizzle-orm";

import { account, session, user } from "./auth";
import {
  answer,
  auditLog,
  caseStudy,
  pdfSettings,
  question,
  student,
  studentAssignment,
} from "./domain";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  teacherAssignments: many(studentAssignment, {
    relationName: "assignmentTeacher",
  }),
  assignmentsCreated: many(studentAssignment, {
    relationName: "assignmentAssignedBy",
  }),
  caseStudiesCreated: many(caseStudy),
  auditLogs: many(auditLog),
  pdfSettingsUpdated: many(pdfSettings),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const studentRelations = relations(student, ({ many }) => ({
  assignments: many(studentAssignment),
  caseStudies: many(caseStudy),
}));

export const studentAssignmentRelations = relations(
  studentAssignment,
  ({ one }) => ({
    student: one(student, {
      fields: [studentAssignment.studentId],
      references: [student.id],
    }),
    teacher: one(user, {
      fields: [studentAssignment.teacherId],
      references: [user.id],
      relationName: "assignmentTeacher",
    }),
    assignedBy: one(user, {
      fields: [studentAssignment.assignedById],
      references: [user.id],
      relationName: "assignmentAssignedBy",
    }),
  }),
);

export const questionRelations = relations(question, ({ many }) => ({
  answers: many(answer),
}));

export const caseStudyRelations = relations(caseStudy, ({ one, many }) => ({
  student: one(student, {
    fields: [caseStudy.studentId],
    references: [student.id],
  }),
  createdBy: one(user, {
    fields: [caseStudy.createdById],
    references: [user.id],
  }),
  answers: many(answer),
}));

export const answerRelations = relations(answer, ({ one }) => ({
  caseStudy: one(caseStudy, {
    fields: [answer.caseStudyId],
    references: [caseStudy.id],
  }),
  question: one(question, {
    fields: [answer.questionId],
    references: [question.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
}));

export const pdfSettingsRelations = relations(pdfSettings, ({ one }) => ({
  updatedBy: one(user, {
    fields: [pdfSettings.updatedById],
    references: [user.id],
  }),
}));
