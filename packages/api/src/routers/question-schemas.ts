import { z } from "zod";

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "date",
  "number",
  "select",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questionTypeSchema = z.enum(QUESTION_TYPES);

const TYPES_WITH_OPTIONS = new Set<QuestionType>([
  "multiple_choice",
  "select",
]);

export function questionTypeNeedsOptions(type: QuestionType): boolean {
  return TYPES_WITH_OPTIONS.has(type);
}

/** Normalize options: required non-empty for choice types; null otherwise. */
export function normalizeQuestionOptions(
  type: QuestionType,
  options: string[] | null | undefined,
): string[] | null {
  if (!questionTypeNeedsOptions(type)) return null;
  if (!options) return null;
  const cleaned = options.map((o) => o.trim()).filter((o) => o.length > 0);
  return cleaned.length > 0 ? cleaned : null;
}

const optionsSchema = z.array(z.string().trim().min(1)).nullable().optional();

type QuestionFieldsInput = {
  prompt: string;
  type: QuestionType;
  section?: string | null;
  sortOrder?: number;
  required?: boolean;
  options?: string[] | null;
};

function refineQuestionFields(
  data: QuestionFieldsInput,
  ctx: z.RefinementCtx,
) {
  const normalized = normalizeQuestionOptions(data.type, data.options);
  if (questionTypeNeedsOptions(data.type) && !normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Opções obrigatórias para este tipo de pergunta",
      path: ["options"],
    });
  }
}

function transformQuestionFields<T extends QuestionFieldsInput>(data: T) {
  return {
    ...data,
    prompt: data.prompt,
    type: data.type,
    section:
      data.section && data.section.trim().length > 0
        ? data.section.trim()
        : null,
    sortOrder: data.sortOrder,
    required: data.required ?? false,
    options: normalizeQuestionOptions(data.type, data.options),
  };
}

export const questionCreateSchema = z
  .object({
    prompt: z.string().trim().min(3, "Enunciado muito curto").max(2000),
    type: questionTypeSchema,
    section: z.string().trim().max(120).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    required: z.boolean().optional(),
    options: optionsSchema,
  })
  .superRefine(refineQuestionFields)
  .transform(transformQuestionFields);

export const questionUpdateSchema = z
  .object({
    id: z.string().uuid(),
    prompt: z.string().trim().min(3, "Enunciado muito curto").max(2000),
    type: questionTypeSchema,
    section: z.string().trim().max(120).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
    required: z.boolean().optional(),
    options: optionsSchema,
  })
  .superRefine(refineQuestionFields)
  .transform(transformQuestionFields);

export const questionReorderItemSchema = z.object({
  id: z.string().uuid(),
  sortOrder: z.number().int().min(0),
  section: z.string().trim().max(120).optional().nullable(),
});

export const questionReorderSchema = z.object({
  items: z.array(questionReorderItemSchema).min(1),
});

/**
 * Move an id one step within an ordered list and reassign contiguous sortOrder.
 * Returns null when the move is a no-op (already at edge).
 */
export function applyReorderMove(
  orderedIds: readonly string[],
  id: string,
  direction: "up" | "down",
): { id: string; sortOrder: number }[] | null {
  const index = orderedIds.indexOf(id);
  if (index < 0) return null;
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= orderedIds.length) return null;

  const next = [...orderedIds];
  const [moved] = next.splice(index, 1);
  if (!moved) return null;
  next.splice(target, 0, moved);

  return next.map((itemId, sortOrder) => ({ id: itemId, sortOrder }));
}
