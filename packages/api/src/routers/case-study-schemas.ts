import type { QuestionSnapshot } from "@auxilio-pedagogico/db/schema/domain";
import { z } from "zod";

import { type QuestionType } from "./question-schemas";

export type { QuestionSnapshot };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_NUMBER = /^-?\d+(\.\d+)?$/;

export type QuestionSnapshotSource = {
  prompt: string;
  type: QuestionType;
  options: string[] | null;
  section: string | null;
  required: boolean;
};

/** ADR-0003: persist prompt/type/options/section/required at answer save time. */
export function buildQuestionSnapshot(
  question: QuestionSnapshotSource,
): QuestionSnapshot {
  return {
    prompt: question.prompt,
    type: question.type,
    options: question.options,
    section: question.section,
    required: question.required,
  };
}

/**
 * ADR-0003 freeze: INSERT stores the live question; UPDATE keeps the existing JSON.
 * Callers must persist the returned snapshot only on insert (update writes value only).
 */
export function resolveAnswerQuestionSnapshot(
  existingSnapshot: QuestionSnapshot | undefined,
  currentQuestion: QuestionSnapshotSource,
): QuestionSnapshot {
  return existingSnapshot ?? buildQuestionSnapshot(currentQuestion);
}

export function isBlankAnswerValue(value: string | null | undefined): boolean {
  return value == null || value.trim().length === 0;
}

/** Inactive questions may only be updated when an answer already exists. */
export function rejectsInactiveQuestionWithoutAnswer(
  active: boolean,
  hasExistingAnswer: boolean,
): boolean {
  return !active && !hasExistingAnswer;
}

/** After merging payload onto existing answers, every active required question must be filled. */
export function hasUnfilledRequiredAnswers(
  requiredActiveIds: readonly string[],
  valuesByQuestionId: ReadonlyMap<string, string | null | undefined>,
): boolean {
  return requiredActiveIds.some((id) =>
    isBlankAnswerValue(valuesByQuestionId.get(id)),
  );
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export type AnswerValueDefinition = {
  type: QuestionType;
  options: string[] | null;
  required: boolean;
};

/**
 * Normalize and validate a serialized answer (text).
 * Throws Error with a Portuguese message on invalid input.
 */
export function serializeAnswerValue(
  definition: AnswerValueDefinition,
  raw: string | null,
): string | null {
  const trimmed = raw == null ? null : raw.trim();
  if (trimmed == null || trimmed.length === 0) {
    if (definition.required) {
      throw new Error("Resposta obrigatória não preenchida");
    }
    return null;
  }

  switch (definition.type) {
    case "date": {
      if (!isValidIsoDate(trimmed)) {
        throw new Error("Data inválida (AAAA-MM-DD)");
      }
      return trimmed;
    }
    case "number": {
      if (!DECIMAL_NUMBER.test(trimmed) || !Number.isFinite(Number(trimmed))) {
        throw new Error("Número inválido");
      }
      return trimmed;
    }
    case "select":
    case "multiple_choice": {
      const options = definition.options ?? [];
      if (!options.includes(trimmed)) {
        throw new Error("Opção inválida");
      }
      return trimmed;
    }
    default:
      return trimmed;
  }
}

export const caseStudyIdInputSchema = z.object({
  id: z.string().uuid(),
});

export const caseStudyListByStudentSchema = z.object({
  studentId: z.string().uuid(),
});

export const caseStudyCreateSchema = z.object({
  studentId: z.string().uuid(),
});

export const caseStudyAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  value: z.string().nullable(),
});

export const caseStudySaveAnswersSchema = z.object({
  caseStudyId: z.string().uuid(),
  answers: z.array(caseStudyAnswerInputSchema),
});

/** Teto de proteção — spec 4.6 não define limite; evita colar arquivos inteiros. */
export const FREE_REPORT_MAX_LENGTH = 20_000;

export const caseStudySaveFreeReportSchema = z.object({
  caseStudyId: z.string().uuid(),
  freeReport: z
    .string()
    .max(
      FREE_REPORT_MAX_LENGTH,
      "Relatório livre muito longo (máximo de 20.000 caracteres)",
    )
    .nullable(),
});
