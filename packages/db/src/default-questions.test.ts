import { describe, expect, test } from "bun:test";

import { DEFAULT_QUESTIONS } from "./default-questions";

describe("perguntas padrão do estudo de caso", () => {
  test("cobre as 6 seções na ordem correta (etapas 1–4 + família + encaminhamentos)", () => {
    const sections = [...new Set(DEFAULT_QUESTIONS.map((q) => q.section))];
    expect(sections).toHaveLength(6);
    for (const [index, section] of sections.entries()) {
      expect(section).toStartWith(`${index + 1}. `);
    }
  });

  test("prompts respeitam os limites do questionCreateSchema (3–2000) e section ≤ 120", () => {
    for (const q of DEFAULT_QUESTIONS) {
      expect(q.prompt.trim().length).toBeGreaterThanOrEqual(3);
      expect(q.prompt.length).toBeLessThanOrEqual(2000);
      expect(q.prompt).toBe(q.prompt.trim());
      expect(q.section).toBeTruthy();
      expect(q.section!.length).toBeLessThanOrEqual(120);
    }
  });

  test("options só existem (e não vazias) em select/multiple_choice", () => {
    for (const q of DEFAULT_QUESTIONS) {
      if (q.type === "select" || q.type === "multiple_choice") {
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options!.length).toBeGreaterThan(0);
        for (const opt of q.options!) {
          expect(opt.trim().length).toBeGreaterThan(0);
        }
      } else {
        expect(q.options ?? null).toBeNull();
      }
    }
  });

  test("(section, sortOrder) é único e sortOrder é sequencial a partir de 1", () => {
    const bySection = new Map<string, number[]>();
    for (const q of DEFAULT_QUESTIONS) {
      const orders = bySection.get(q.section!) ?? [];
      orders.push(q.sortOrder!);
      bySection.set(q.section!, orders);
    }
    for (const orders of bySection.values()) {
      expect(new Set(orders).size).toBe(orders.length);
      expect(Math.min(...orders)).toBe(1);
      expect(Math.max(...orders)).toBe(orders.length);
    }
  });

  test("cada seção tem ao menos uma pergunta obrigatória e todas nascem ativas", () => {
    const sections = new Set(DEFAULT_QUESTIONS.map((q) => q.section));
    for (const section of sections) {
      expect(
        DEFAULT_QUESTIONS.some((q) => q.section === section && q.required),
      ).toBe(true);
    }
    expect(DEFAULT_QUESTIONS.every((q) => q.active === true)).toBe(true);
  });

  test("nenhuma pergunta obrigatória exige laudo/diagnóstico (Decreto 12.686/2025, art. 11, § 7º)", () => {
    for (const q of DEFAULT_QUESTIONS.filter((q) => q.required)) {
      expect(/laudo|diagnóstico/i.test(q.prompt)).toBe(false);
    }
  });
});
