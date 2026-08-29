import { describe, expect, test } from "bun:test";

import {
  escapeHtml,
  formatAnswerValue,
  formatIsoDatePtBr,
  renderCaseStudyHtml,
  type CaseStudyPdfData,
} from "./template";

function baseData(overrides: Partial<CaseStudyPdfData> = {}): CaseStudyPdfData {
  return {
    settings: {
      schoolName: "Escola Teste",
      institutionalInfo: null,
      headerText: null,
      footerText: null,
    },
    student: {
      name: "Ana",
      className: "3º Ano A",
      birthDate: "2016-03-12",
      guardian: "Maria",
      shift: "morning",
    },
    createdByName: "Professora Seed",
    generatedByName: "Diretora Seed",
    generatedAt: new Date("2026-08-29T12:00:00Z"),
    answers: [],
    freeReport: null,
    ...overrides,
  };
}

describe("escapeHtml", () => {
  test("escapa os cinco metacaracteres", () => {
    expect(escapeHtml(`<script>&"'`)).toBe(
      "&lt;script&gt;&amp;&quot;&#39;",
    );
  });
});

describe("formatIsoDatePtBr", () => {
  test("fatia a string sem deslocar fuso", () => {
    expect(formatIsoDatePtBr("2020-03-01")).toBe("01/03/2020");
  });
});

describe("formatAnswerValue", () => {
  test("date vira dd/mm/aaaa", () => {
    expect(formatAnswerValue({ type: "date" }, "2020-03-01")).toBe(
      "01/03/2020",
    );
  });
  test("number troca ponto por vírgula", () => {
    expect(formatAnswerValue({ type: "number" }, "3.5")).toBe("3,5");
  });
  test("vazio/whitespace vira travessão", () => {
    expect(formatAnswerValue({ type: "short_text" }, "  ")).toBe("—");
    expect(formatAnswerValue({ type: "short_text" }, null)).toBe("—");
  });
  test("long_text escapa e preserva quebras", () => {
    expect(formatAnswerValue({ type: "long_text" }, "a<b\nc")).toBe(
      "a&lt;b<br>c",
    );
  });
});

describe("renderCaseStudyHtml", () => {
  test("escapa texto livre (anti-injeção no Chromium)", () => {
    const html = renderCaseStudyHtml(
      baseData({
        freeReport: `<script>alert("x")</script>`,
        student: {
          name: `<img onerror=x>`,
          className: null,
          birthDate: null,
          guardian: null,
          shift: null,
        },
      }),
    );
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;script&gt;");
  });

  test("usa o snapshot da pergunta (ADR-0003), agrupado por seção", () => {
    const html = renderCaseStudyHtml(
      baseData({
        answers: [
          {
            questionSnapshot: {
              prompt: "Enunciado congelado?",
              type: "short_text",
              options: null,
              section: "Seção A",
              required: true,
            },
            value: "sim",
          },
          {
            questionSnapshot: {
              prompt: "Sem seção",
              type: "short_text",
              options: null,
              section: null,
              required: false,
            },
            value: null,
          },
        ],
      }),
    );
    expect(html).toContain("Enunciado congelado?");
    expect(html).toContain("Seção A");
    expect(html).toContain("Geral");
    expect(html).toContain("—");
  });

  test("cabeçalho/rodapé opcionais e fallback de escola", () => {
    const withAll = renderCaseStudyHtml(
      baseData({
        settings: {
          schoolName: "Escola X",
          institutionalInfo: "Rua 1\nCentro",
          headerText: "Cabeçalho extra",
          footerText: "Rodapé oficial",
        },
      }),
    );
    expect(withAll).toContain("Escola X");
    expect(withAll).toContain("Rua 1<br>Centro");
    expect(withAll).toContain("Cabeçalho extra");
    expect(withAll).toContain("Rodapé oficial");

    const without = renderCaseStudyHtml(baseData({ settings: null }));
    expect(without).toContain("Escola");
    expect(without).not.toContain("footer>Rodapé");
  });

  test("relatório livre vazio mostra 'Não preenchido'", () => {
    const html = renderCaseStudyHtml(baseData({ freeReport: "  " }));
    expect(html).toContain("Não preenchido.");
  });
});
