import { describe, expect, test } from "bun:test";

import {
  applyReorderMove,
  normalizeQuestionOptions,
  questionCreateSchema,
  questionReorderSchema,
  questionTypeNeedsOptions,
  questionUpdateSchema,
} from "./question-schemas";

describe("questionTypeNeedsOptions", () => {
  test("only multiple_choice and select need options", () => {
    expect(questionTypeNeedsOptions("multiple_choice")).toBe(true);
    expect(questionTypeNeedsOptions("select")).toBe(true);
    expect(questionTypeNeedsOptions("short_text")).toBe(false);
    expect(questionTypeNeedsOptions("long_text")).toBe(false);
    expect(questionTypeNeedsOptions("date")).toBe(false);
    expect(questionTypeNeedsOptions("number")).toBe(false);
  });
});

describe("normalizeQuestionOptions", () => {
  test("returns null for non-choice types", () => {
    expect(normalizeQuestionOptions("short_text", ["a"])).toBeNull();
    expect(normalizeQuestionOptions("date", null)).toBeNull();
  });

  test("trims and drops empty options for choice types", () => {
    expect(
      normalizeQuestionOptions("select", ["  Manhã ", "", "Tarde"]),
    ).toEqual(["Manhã", "Tarde"]);
  });

  test("returns null when choice type has no usable options", () => {
    expect(normalizeQuestionOptions("multiple_choice", [])).toBeNull();
    expect(normalizeQuestionOptions("multiple_choice", ["  "])).toBeNull();
    expect(normalizeQuestionOptions("select", null)).toBeNull();
  });
});

describe("questionCreateSchema", () => {
  test("accepts long_text without options", () => {
    const parsed = questionCreateSchema.parse({
      prompt: "Quais dificuldades o aluno apresenta?",
      type: "long_text",
      section: "Informações pedagógicas",
      required: true,
    });
    expect(parsed.options).toBeNull();
    expect(parsed.section).toBe("Informações pedagógicas");
    expect(parsed.required).toBe(true);
  });

  test("rejects short prompt", () => {
    expect(() =>
      questionCreateSchema.parse({
        prompt: "ab",
        type: "short_text",
      }),
    ).toThrow();
  });

  test("requires options for select", () => {
    expect(() =>
      questionCreateSchema.parse({
        prompt: "Turno de maior dificuldade",
        type: "select",
        options: [],
      }),
    ).toThrow();
  });

  test("accepts select with options and clears blank section", () => {
    const parsed = questionCreateSchema.parse({
      prompt: "Turno de maior dificuldade",
      type: "select",
      section: "   ",
      options: ["Manhã", "Tarde"],
    });
    expect(parsed.section).toBeNull();
    expect(parsed.options).toEqual(["Manhã", "Tarde"]);
  });

  test("forces options to null for number type even if provided", () => {
    const parsed = questionCreateSchema.parse({
      prompt: "Quantidade de faltas no mês",
      type: "number",
      options: ["1", "2"],
    });
    expect(parsed.options).toBeNull();
  });

  test("requires options for multiple_choice", () => {
    expect(() =>
      questionCreateSchema.parse({
        prompt: "Nível de autonomia nas atividades",
        type: "multiple_choice",
        options: null,
      }),
    ).toThrow();
  });

  test("defaults required to false and trims prompt", () => {
    const parsed = questionCreateSchema.parse({
      prompt: "  Nome social do aluno  ",
      type: "short_text",
    });
    expect(parsed.prompt).toBe("Nome social do aluno");
    expect(parsed.required).toBe(false);
    expect(parsed.options).toBeNull();
  });

  test("rejects invalid type and negative sortOrder", () => {
    expect(() =>
      questionCreateSchema.parse({
        prompt: "Enunciado válido aqui",
        type: "checkbox",
      }),
    ).toThrow();

    expect(() =>
      questionCreateSchema.parse({
        prompt: "Enunciado válido aqui",
        type: "short_text",
        sortOrder: -1,
      }),
    ).toThrow();
  });
});

describe("questionUpdateSchema", () => {
  const validId = "11111111-1111-4111-8111-111111111111";

  test("requires uuid id", () => {
    expect(() =>
      questionUpdateSchema.parse({
        id: "not-a-uuid",
        prompt: "Enunciado válido aqui",
        type: "date",
      }),
    ).toThrow();

    const parsed = questionUpdateSchema.parse({
      id: validId,
      prompt: "Data da última avaliação",
      type: "date",
    });
    expect(parsed.id).toBe(validId);
  });

  test("rejects short prompt", () => {
    expect(() =>
      questionUpdateSchema.parse({
        id: validId,
        prompt: "ok",
        type: "long_text",
      }),
    ).toThrow();
  });

  test("requires options for multiple_choice and select", () => {
    expect(() =>
      questionUpdateSchema.parse({
        id: validId,
        prompt: "Preferência de material de apoio",
        type: "multiple_choice",
        options: [],
      }),
    ).toThrow();

    expect(() =>
      questionUpdateSchema.parse({
        id: validId,
        prompt: "Turno de maior dificuldade",
        type: "select",
      }),
    ).toThrow();
  });

  test("accepts select with options and clears blank section", () => {
    const parsed = questionUpdateSchema.parse({
      id: validId,
      prompt: "Turno de maior dificuldade",
      type: "select",
      section: "  ",
      options: ["  Manhã ", "Tarde"],
      required: true,
    });
    expect(parsed.section).toBeNull();
    expect(parsed.options).toEqual(["Manhã", "Tarde"]);
    expect(parsed.required).toBe(true);
  });

  test("forces options to null for short_text even if provided", () => {
    const parsed = questionUpdateSchema.parse({
      id: validId,
      prompt: "Nome do responsável pedagógico",
      type: "short_text",
      options: ["A", "B"],
    });
    expect(parsed.options).toBeNull();
  });
});

describe("questionReorderSchema", () => {
  test("accepts ordered items", () => {
    const parsed = questionReorderSchema.parse({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          sortOrder: 0,
          section: "Dados do aluno",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          sortOrder: 1,
        },
      ],
    });
    expect(parsed.items).toHaveLength(2);
  });

  test("rejects empty items", () => {
    expect(() => questionReorderSchema.parse({ items: [] })).toThrow();
  });

  test("rejects invalid item id or negative sortOrder", () => {
    expect(() =>
      questionReorderSchema.parse({
        items: [{ id: "bad", sortOrder: 0 }],
      }),
    ).toThrow();

    expect(() =>
      questionReorderSchema.parse({
        items: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            sortOrder: -1,
          },
        ],
      }),
    ).toThrow();
  });
});

describe("applyReorderMove", () => {
  const ids = ["a", "b", "c"];

  test("moves item up and reindexes sortOrder", () => {
    expect(applyReorderMove(ids, "b", "up")).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ]);
  });

  test("moves item down", () => {
    expect(applyReorderMove(ids, "a", "down")).toEqual([
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ]);
  });

  test("returns null at edges or unknown id", () => {
    expect(applyReorderMove(ids, "a", "up")).toBeNull();
    expect(applyReorderMove(ids, "c", "down")).toBeNull();
    expect(applyReorderMove(ids, "z", "up")).toBeNull();
  });

  test("swaps two items and no-ops on single list", () => {
    expect(applyReorderMove(["x", "y"], "y", "up")).toEqual([
      { id: "y", sortOrder: 0 },
      { id: "x", sortOrder: 1 },
    ]);
    expect(applyReorderMove(["only"], "only", "up")).toBeNull();
    expect(applyReorderMove(["only"], "only", "down")).toBeNull();
  });
});
