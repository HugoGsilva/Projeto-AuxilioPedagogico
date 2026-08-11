import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { questionTypeEnum, shiftEnum } from "./enums";

/** Snapshot of a question at answer time — ADR-0003 */
export type QuestionSnapshot = {
  prompt: string;
  type: (typeof questionTypeEnum.enumValues)[number];
  options: string[] | null;
  section: string | null;
  required: boolean;
};

export const student = pgTable(
  "student",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    /** Descriptive class label — not an entity (ADR-0002 / glossario). */
    className: text("class_name"),
    birthDate: date("birth_date"),
    guardian: text("guardian"),
    shift: shiftEnum("shift"),
    notes: text("notes"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("student_name_idx").on(table.name)],
);

/** Teacher ↔ student assignment — authorizes teacher access (ADR-0002). */
export const studentAssignment = pgTable(
  "student_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedById: text("assigned_by_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("student_assignment_student_teacher_uid").on(
      table.studentId,
      table.teacherId,
    ),
    index("student_assignment_teacher_idx").on(table.teacherId),
    index("student_assignment_student_idx").on(table.studentId),
  ],
);

/**
 * Configurable case-study question.
 * `section` is a thematic label (questionSection in glossario), not a separate table in MVP.
 */
export const question = pgTable(
  "question",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prompt: text("prompt").notNull(),
    type: questionTypeEnum("type").notNull(),
    section: text("section"),
    sortOrder: integer("sort_order").default(0).notNull(),
    required: boolean("required").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    /** Choices for multiple_choice / select; null for other types. */
    options: jsonb("options").$type<string[] | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("question_section_order_idx").on(table.section, table.sortOrder),
    index("question_active_idx").on(table.active),
  ],
);

export const caseStudy = pgTable(
  "case_study",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => student.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** Free-form teacher report — field on case study for MVP (issue #1). */
    freeReport: text("free_report"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("case_study_student_idx").on(table.studentId),
    index("case_study_created_by_idx").on(table.createdById),
  ],
);

export const answer = pgTable(
  "answer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseStudyId: uuid("case_study_id")
      .notNull()
      .references(() => caseStudy.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => question.id, { onDelete: "restrict" }),
    /** Serialized answer value (string, number, date ISO, or choice text). */
    value: text("value"),
    /** Question snapshot at save time — ADR-0003. */
    questionSnapshot: jsonb("question_snapshot")
      .$type<QuestionSnapshot>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("answer_case_study_question_uid").on(
      table.caseStudyId,
      table.questionId,
    ),
    index("answer_case_study_idx").on(table.caseStudyId),
  ],
);

/** Append-only audit trail — ADR-0004. No UPDATE/DELETE routes. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    ip: text("ip"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_entity_idx").on(table.entityType, table.entityId),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);

/** School PDF institutional settings — singleton row expected in app layer. */
export const pdfSettings = pgTable("pdf_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolName: text("school_name").notNull(),
  institutionalInfo: text("institutional_info"),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  updatedById: text("updated_by_id").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
