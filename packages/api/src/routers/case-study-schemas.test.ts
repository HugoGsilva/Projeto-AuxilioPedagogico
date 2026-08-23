import { describe, expect, test } from "bun:test";

import {
  buildQuestionSnapshot,
  caseStudyCreateSchema,
  caseStudyIdInputSchema,
  caseStudyListByStudentSchema,
  caseStudySaveAnswersSchema,
  hasUnfilledRequiredAnswers,
  isBlankAnswerValue,
  rejectsInactiveQuestionWithoutAnswer,
  resolveAnswerQuestionSnapshot,
  serializeAnswerValue,
} from "./case-study-schemas";

const CASE_STUDY_ID = "11111111-1111-4111-8111-111111111111";
const QUESTION_ID = "22222222-2222-4222-8222-222222222222";
const STUDENT_ID = "33333333-3333-4333-8333-333333333333";

const source = {
  prompt: "Qual o nível de autonomia nas atividades?",
  type: "select" as const,
  options: ["Baixa", "Média", "Alta"],
  section: "Informações pedagógicas",
  required: true,
};

describe("buildQuestionSnapshot", () => {
  test("copies prompt, type, options, section and required", () => {
    expect(buildQuestionSnapshot(source)).toEqual({
      prompt: source.prompt,
      type: source.type,
      options: source.options,
      section: source.section,
      required: source.required,
    });
  });

  test("keeps null options and section", () => {
    expect(
      buildQuestionSnapshot({
        prompt: "Observações gerais",
        type: "long_text",
        options: null,
        section: null,
        required: false,
      }),
    ).toEqual({
      prompt: "Observações gerais",
      type: "long_text",
      options: null,
      section: null,
      required: false,
    });
  });
});

describe("resolveAnswerQuestionSnapshot (ADR-0003 freeze)", () => {
  const current = {
    prompt: "Enunciado atual da pergunta",
    type: "short_text" as const,
    options: null,
    section: "Seção nova",
    required: false,
  };

  test("INSERT uses the current question snapshot", () => {
    expect(resolveAnswerQuestionSnapshot(undefined, current)).toEqual(
      buildQuestionSnapshot(current),
    );
  });

  test("UPDATE keeps the frozen snapshot even if the live question changed", () => {
    const frozen = buildQuestionSnapshot(source);
    expect(resolveAnswerQuestionSnapshot(frozen, current)).toEqual(frozen);
    expect(resolveAnswerQuestionSnapshot(frozen, current).prompt).toBe(
      source.prompt,
    );
  });
});

describe("isBlankAnswerValue", () => {
  test("treats null, undefined and whitespace as blank", () => {
    expect(isBlankAnswerValue(null)).toBe(true);
    expect(isBlankAnswerValue(undefined)).toBe(true);
    expect(isBlankAnswerValue("")).toBe(true);
    expect(isBlankAnswerValue("   ")).toBe(true);
  });

  test("treats non-empty text as filled", () => {
    expect(isBlankAnswerValue("ok")).toBe(false);
    expect(isBlankAnswerValue("  ok  ")).toBe(false);
  });
});

describe("rejectsInactiveQuestionWithoutAnswer", () => {
  test("rejects inactive question when there is no existing answer", () => {
    expect(rejectsInactiveQuestionWithoutAnswer(false, false)).toBe(true);
  });

  test("allows inactive question when an answer already exists", () => {
    expect(rejectsInactiveQuestionWithoutAnswer(false, true)).toBe(false);
  });

  test("allows active questions regardless of existing answer", () => {
    expect(rejectsInactiveQuestionWithoutAnswer(true, false)).toBe(false);
    expect(rejectsInactiveQuestionWithoutAnswer(true, true)).toBe(false);
  });
});

describe("hasUnfilledRequiredAnswers", () => {
  test("is false when payload plus existing answers fill every required id", () => {
    const values = new Map<string, string | null>([
      ["q-existing", "já preenchida"],
      ["q-payload", "nova"],
    ]);
    expect(hasUnfilledRequiredAnswers(["q-existing", "q-payload"], values)).toBe(
      false,
    );
  });

  test("is true when a required active question is missing after merge", () => {
    const values = new Map<string, string | null>([["q-payload", "nova"]]);
    expect(
      hasUnfilledRequiredAnswers(["q-payload", "q-required-missing"], values),
    ).toBe(true);
  });

  test("treats whitespace as unfilled", () => {
    const values = new Map<string, string | null>([["q1", "  "]]);
    expect(hasUnfilledRequiredAnswers(["q1"], values)).toBe(true);
  });
});

describe("serializeAnswerValue", () => {
  test("rejects empty required values", () => {
    expect(() =>
      serializeAnswerValue(
        { type: "short_text", options: null, required: true },
        null,
      ),
    ).toThrow("Resposta obrigatória não preenchida");

    expect(() =>
      serializeAnswerValue(
        { type: "short_text", options: null, required: true },
        "   ",
      ),
    ).toThrow("Resposta obrigatória não preenchida");
  });

  test("allows empty optional values as null", () => {
    expect(
      serializeAnswerValue(
        { type: "short_text", options: null, required: false },
        "",
      ),
    ).toBeNull();
  });

  test("trims short_text and long_text", () => {
    expect(
      serializeAnswerValue(
        { type: "short_text", options: null, required: true },
        "  autonomia  ",
      ),
    ).toBe("autonomia");

    expect(
      serializeAnswerValue(
        { type: "long_text", options: null, required: true },
        "  parágrafo com espaços  ",
      ),
    ).toBe("parágrafo com espaços");
  });

  test("optional choice empty becomes null", () => {
    expect(
      serializeAnswerValue(
        {
          type: "select",
          options: ["Manhã", "Tarde"],
          required: false,
        },
        "   ",
      ),
    ).toBeNull();

    expect(
      serializeAnswerValue(
        {
          type: "multiple_choice",
          options: ["Sim", "Não"],
          required: false,
        },
        null,
      ),
    ).toBeNull();
  });

  test("accepts a valid multiple_choice option", () => {
    expect(
      serializeAnswerValue(
        {
          type: "multiple_choice",
          options: ["Sim", "Não"],
          required: true,
        },
        " Sim ",
      ),
    ).toBe("Sim");
  });

  test("accepts ISO dates and rejects invalid dates", () => {
    expect(
      serializeAnswerValue(
        { type: "date", options: null, required: true },
        "2026-08-22",
      ),
    ).toBe("2026-08-22");

    expect(() =>
      serializeAnswerValue(
        { type: "date", options: null, required: true },
        "22/08/2026",
      ),
    ).toThrow("Data inválida (AAAA-MM-DD)");

    expect(() =>
      serializeAnswerValue(
        { type: "date", options: null, required: true },
        "2026-02-31",
      ),
    ).toThrow("Data inválida (AAAA-MM-DD)");
  });

  test("accepts decimal numbers and rejects invalid numbers", () => {
    expect(
      serializeAnswerValue(
        { type: "number", options: null, required: true },
        "12.5",
      ),
    ).toBe("12.5");

    expect(() =>
      serializeAnswerValue(
        { type: "number", options: null, required: true },
        "12,5",
      ),
    ).toThrow("Número inválido");

    expect(() =>
      serializeAnswerValue(
        { type: "number", options: null, required: false },
        "abc",
      ),
    ).toThrow("Número inválido");
  });

  test("choice value must be one of the options", () => {
    const definition = {
      type: "select" as const,
      options: ["Manhã", "Tarde"],
      required: true,
    };
    expect(serializeAnswerValue(definition, "Manhã")).toBe("Manhã");
    expect(() => serializeAnswerValue(definition, "Noite")).toThrow(
      "Opção inválida",
    );

    expect(() =>
      serializeAnswerValue(
        {
          type: "multiple_choice",
          options: ["Sim", "Não"],
          required: false,
        },
        "Talvez",
      ),
    ).toThrow("Opção inválida");
  });
});

describe("caseStudy input schemas", () => {
  test("rejects non-uuid ids", () => {
    expect(() => caseStudyIdInputSchema.parse({ id: "not-a-uuid" })).toThrow();
    expect(() =>
      caseStudyListByStudentSchema.parse({ studentId: "aluno-1" }),
    ).toThrow();
    expect(() =>
      caseStudyCreateSchema.parse({ studentId: "123" }),
    ).toThrow();
    expect(() =>
      caseStudySaveAnswersSchema.parse({
        caseStudyId: "not-a-uuid",
        answers: [],
      }),
    ).toThrow();
    expect(() =>
      caseStudySaveAnswersSchema.parse({
        caseStudyId: CASE_STUDY_ID,
        answers: [{ questionId: "q1", value: "x" }],
      }),
    ).toThrow();
  });

  test("accepts uuid caseStudyId and nullable values", () => {
    const parsed = caseStudySaveAnswersSchema.parse({
      caseStudyId: CASE_STUDY_ID,
      answers: [
        {
          questionId: QUESTION_ID,
          value: null,
        },
      ],
    });
    expect(parsed.answers).toHaveLength(1);
  });

  test("allows empty answers array (required fields are checked on the server)", () => {
    const parsed = caseStudySaveAnswersSchema.parse({
      caseStudyId: CASE_STUDY_ID,
      answers: [],
    });
    expect(parsed.answers).toEqual([]);
  });

  test("accepts create/list schemas with uuid studentId", () => {
    expect(caseStudyCreateSchema.parse({ studentId: STUDENT_ID })).toEqual({
      studentId: STUDENT_ID,
    });
    expect(
      caseStudyListByStudentSchema.parse({ studentId: STUDENT_ID }),
    ).toEqual({ studentId: STUDENT_ID });
  });
});
