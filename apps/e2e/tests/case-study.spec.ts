import { expect, type Page, test } from "@playwright/test";

import { SEED_STUDENTS } from "./helpers/accounts";
import {
  SNAPSHOT_ENABLED,
  storageStatePath,
  WRITE_ENABLED,
} from "./helpers/auth";

/** Enunciado seed da pergunta obrigatória (packages/db/src/default-questions.ts). */
const REQUIRED_PROMPT =
  "Quais são as principais demandas do aluno no contexto escolar (pedagógicas, de comunicação, de interação, de locomoção ou de cuidado)?";
const REQUIRED_RE = new RegExp(REQUIRED_PROMPT.slice(0, 20));

/** Abre a tela de estudos de caso de um aluno pelo nome. */
async function openStudentCaseStudies(page: Page, studentName: string) {
  await page.goto("/students");
  await expect(
    page.getByRole("heading", { name: "Alunos", level: 1 }),
  ).toBeVisible();
  await page
    .getByRole("row", { name: new RegExp(studentName) })
    .getByRole("link", { name: "Estudos de caso" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Estudos de caso", level: 1 }),
  ).toBeVisible();
}

/** Cria um novo estudo de caso e retorna sua URL (para reabrir depois). */
async function createCaseStudy(page: Page): Promise<string> {
  await page.getByRole("button", { name: "Novo estudo de caso" }).click();
  await expect(
    page.getByRole("heading", { name: "Estudo de caso", level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/case-studies\//);
  return page.url();
}

/**
 * Preenche todos os campos obrigatórios AINDA vazios do formulário. O conjunto
 * de perguntas do ambiente pode ter mais do que o seed (perguntas criadas na
 * tela de Perguntas), e um campo obrigatório vazio faz a validação nativa
 * bloquear o "Salvar respostas". Não sobrescreve valores já preenchidos.
 */
async function fillRequiredFields(page: Page) {
  const form = page.locator("form");

  const textareas = form.locator("textarea[required]");
  for (let i = 0; i < (await textareas.count()); i++) {
    const el = textareas.nth(i);
    if (!(await el.inputValue())) await el.fill("E2E");
  }

  const inputs = form.locator("input[required]");
  for (let i = 0; i < (await inputs.count()); i++) {
    const el = inputs.nth(i);
    if (await el.inputValue()) continue;
    const type = (await el.getAttribute("type")) ?? "text";
    if (type === "date") await el.fill("2020-01-01");
    else if (type === "number") await el.fill("1");
    else await el.fill("E2E");
  }

  const selects = form.locator("select[required]");
  for (let i = 0; i < (await selects.count()); i++) {
    const el = selects.nth(i);
    if (!(await el.inputValue())) await el.selectOption({ index: 1 });
  }
}

test.describe("Estudo de caso — preenchimento (E2E_WRITE=1)", () => {
  test.skip(
    !WRITE_ENABLED,
    "Testes de escrita desligados. Rode com E2E_WRITE=1 para gravar dados no ambiente de homologação.",
  );
  test.use({ storageState: storageStatePath("pedagogue") });

  test("cria, responde pergunta obrigatória, salva e reabre", async ({
    page,
  }) => {
    const marker = `Resposta E2E ${new Date().toISOString()}`;

    await openStudentCaseStudies(page, SEED_STUDENTS.assigned);
    const url = await createCaseStudy(page);

    const field = page.getByLabel(REQUIRED_RE);
    await expect(field).toBeVisible();
    await field.fill(marker);
    await fillRequiredFields(page);

    await page.getByRole("button", { name: "Salvar respostas" }).click();
    await expect(page.getByText("Respostas salvas")).toBeVisible();

    // Reabre o estudo: a resposta persistiu.
    await page.goto(url);
    await expect(page.getByLabel(REQUIRED_RE)).toHaveValue(marker);
  });

  test("salva o relatório livre sem preencher respostas e reabre", async ({
    page,
  }) => {
    const marker = `Relatório E2E ${new Date().toISOString()}`;

    await openStudentCaseStudies(page, SEED_STUDENTS.assigned);
    const url = await createCaseStudy(page);

    // Salva só o relatório livre: não depende das perguntas obrigatórias.
    await page.getByLabel("Observações da professora").fill(marker);
    await page.getByRole("button", { name: "Salvar relatório" }).click();
    await expect(page.getByText("Relatório salvo")).toBeVisible();

    await page.goto(url);
    await expect(page.getByLabel("Observações da professora")).toHaveValue(
      marker,
    );
  });

  test("lista de alunos mostra a completude do estudo mais recente", async ({
    page,
  }) => {
    await openStudentCaseStudies(page, SEED_STUDENTS.assigned);
    const url = await createCaseStudy(page);

    // Recém-criado, sem respostas: pílula "Incompleto" na lista de alunos.
    const studentRow = () =>
      page.getByRole("row", { name: new RegExp(SEED_STUDENTS.assigned) });
    await page.goto("/students");
    await expect(
      studentRow().getByText("Incompleto", { exact: true }),
    ).toBeVisible();

    // Preenche as obrigatórias e salva (espera o form renderizar de fato —
    // o heading aparece antes das queries resolverem).
    await page.goto(url);
    await expect(page.getByLabel(REQUIRED_RE)).toBeVisible();
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Salvar respostas" }).click();
    await expect(page.getByText("Respostas salvas")).toBeVisible();

    // A lista reflete "Completo" para o estudo mais recente.
    await page.goto("/students");
    await expect(
      studentRow().getByText("Completo", { exact: true }),
    ).toBeVisible();
  });

  test("gera o PDF do estudo completo pela lista de alunos", async ({
    page,
  }) => {
    // Auto-suficiente: cria e completa o próprio estudo (não depende de ordem).
    await openStudentCaseStudies(page, SEED_STUDENTS.assigned);
    await createCaseStudy(page);
    await expect(page.getByLabel(REQUIRED_RE)).toBeVisible();
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Salvar respostas" }).click();
    await expect(page.getByText("Respostas salvas")).toBeVisible();

    await page.goto("/students");
    const row = page.getByRole("row", {
      name: new RegExp(SEED_STUDENTS.assigned),
    });
    await expect(row.getByText("Completo", { exact: true })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await row
      .getByRole("button", { name: "Gerar PDF do estudo de caso" })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^estudo-de-caso-.+\.pdf$/);
    await expect(page.getByText("PDF gerado")).toBeVisible();
  });
});

test.describe("Snapshot do enunciado — ADR-0003 (E2E_SNAPSHOT=1)", () => {
  test.skip(
    !SNAPSHOT_ENABLED,
    "Teste de snapshot desligado. Edita uma pergunta seed globalmente; rode só em homologação dedicada com E2E_SNAPSHOT=1.",
  );
  test.use({ storageState: storageStatePath("director") });

  test("editar enunciado não altera documento já respondido", async ({
    page,
  }) => {
    const marker = `Snapshot E2E ${new Date().toISOString()}`;
    const editedPrompt = `${REQUIRED_PROMPT} [editado-e2e]`;

    // 1) Cria e responde um estudo de caso com o enunciado vigente.
    await openStudentCaseStudies(page, SEED_STUDENTS.assigned);
    const url = await createCaseStudy(page);
    await expect(page.getByText(REQUIRED_PROMPT)).toBeVisible();
    await page.getByLabel(REQUIRED_RE).fill(marker);
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Salvar respostas" }).click();
    await expect(page.getByText("Respostas salvas")).toBeVisible();

    try {
      // 2) Edita o enunciado da pergunta.
      await page.goto("/questions");
      await expect(
        page.getByRole("heading", { name: "Perguntas", level: 1 }),
      ).toBeVisible();
      await page
        .getByRole("row", { name: REQUIRED_RE })
        .getByRole("button", { name: "Editar" })
        .click();
      await page.locator("#question-prompt").fill(editedPrompt);
      await page.getByRole("button", { name: "Salvar" }).click();
      await expect(page.getByText("Pergunta atualizada")).toBeVisible();

      // 3) Reabre o estudo antigo: mostra o SNAPSHOT (texto original), não o novo.
      await page.goto(url);
      // A resposta continua vinculada à pergunta pelo enunciado original...
      await expect(page.getByLabel(REQUIRED_RE)).toHaveValue(marker);
      // ...e o texto editado NÃO aparece no documento antigo (snapshot vigente).
      await expect(page.getByText("[editado-e2e]")).toHaveCount(0);
    } finally {
      // 4) Reverte o enunciado para não deixar o ambiente alterado.
      await page.goto("/questions");
      await page
        .getByRole("row", { name: /editado-e2e/ })
        .getByRole("button", { name: "Editar" })
        .click();
      await page.locator("#question-prompt").fill(REQUIRED_PROMPT);
      await page.getByRole("button", { name: "Salvar" }).click();
      await expect(page.getByText("Pergunta atualizada")).toBeVisible();
    }
  });
});
