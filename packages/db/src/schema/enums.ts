import { pgEnum } from "drizzle-orm/pg-core";

/** Fixed roles — ADR-0002 */
export const userRoleEnum = pgEnum("user_role", [
  "director",
  "it_admin",
  "pedagogue",
  "teacher",
]);

/** Student shift — glossario: manhã / tarde / integral */
export const shiftEnum = pgEnum("shift", ["morning", "afternoon", "full_day"]);

/** Configurable question answer types — glossario / spec 4.4 */
export const questionTypeEnum = pgEnum("question_type", [
  "short_text",
  "long_text",
  "multiple_choice",
  "date",
  "number",
  "select",
]);
