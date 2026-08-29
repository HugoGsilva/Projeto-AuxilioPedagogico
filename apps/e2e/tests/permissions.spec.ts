import { expect, type Page, test } from "@playwright/test";

import {
  ACCOUNTS,
  EXPECTED_NAV,
  FORBIDDEN_NAV,
  type RoleKey,
  SEED_STUDENTS,
} from "./helpers/accounts";
import { storageStatePath, WRITE_ENABLED } from "./helpers/auth";

const ROLES: RoleKey[] = ["director", "it_admin", "pedagogue", "teacher"];
const TEACHER_EMAIL = ACCOUNTS.teacher.email;

// Navegação visível por papel (app-shell NAV_GROUPS × matriz ADR-0002).
for (const role of ROLES) {
  test.describe(`Navegação — ${ACCOUNTS[role].roleLabel}`, () => {
    test.use({ storageState: storageStatePath(role) });

    test("mostra só os itens permitidos", async ({ page }) => {
      await page.goto("/dashboard");
      const aside = page.locator("aside");
      await expect(aside.getByRole("link").first()).toBeVisible();

      for (const label of EXPECTED_NAV[role]) {
        await expect(aside.getByRole("link", { name: label })).toBeVisible();
      }
      for (const label of FORBIDDEN_NAV[role]) {
        await expect(aside.getByRole("link", { name: label })).toHaveCount(0);
      }
    });
  });
}

test.describe("TI não acessa dados de aluno (ADR-0002)", () => {
  test.use({ storageState: storageStatePath("it_admin") });

  test("sem item de menu e sem vazar lista via navegação direta", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.locator("aside").getByRole("link", { name: "Alunos" }),
    ).toHaveCount(0);

    await page.goto("/students");
    await expect(
      page.getByRole("heading", { name: "Alunos", level: 1 }),
    ).toBeVisible();
    // A lista de alunos não deve aparecer (servidor nega com 403).
    await expect(page.getByText(SEED_STUDENTS.assigned)).toHaveCount(0);
    await expect(page.getByText(SEED_STUDENTS.unassigned)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Novo aluno" }),
    ).toHaveCount(0);
  });

  test("navegação direta para /case-studies não vaza estudos de caso", async ({
    page,
  }) => {
    await page.goto("/case-studies");
    await expect(
      page.getByRole("heading", { name: "Estudos de caso", level: 1 }),
    ).toBeVisible();
    // O servidor nega a query com 403 — o erro precisa aparecer, senão o
    // teste não distingue "acesso negado" de "lista vazia". Escopado ao main
    // porque o toast global duplica a mensagem.
    await expect(
      page.getByRole("main").getByText(/Permissão negada/),
    ).toBeVisible();
    await expect(page.getByText(SEED_STUDENTS.assigned)).toHaveCount(0);
    await expect(page.getByText(SEED_STUDENTS.unassigned)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Abrir" })).toHaveCount(0);
  });
});

/** Nomes de alunos visíveis na tabela de /students (primeira coluna). */
async function visibleStudentNames(page: Page): Promise<string[]> {
  const rows = await page.locator("table tbody tr").allInnerTexts();
  return rows.map((r) => r.split("\t")[0]!.split("\n")[0]!.trim());
}

test.describe("Professora vê exatamente os alunos atribuídos (ADR-0002)", () => {
  test("a lista da professora bate com a tela de Atribuições", async ({
    browser,
  }) => {
    // Verdade das atribuições: lida como diretora (quem gerencia atribuições).
    const dirCtx = await browser.newContext({
      storageState: storageStatePath("director"),
    });
    const dirPage = await dirCtx.newPage();
    await dirPage.goto("/assignments");
    await expect(
      dirPage.getByRole("heading", { name: "Atribuições", level: 1 }),
    ).toBeVisible();
    // Espera as linhas renderizarem (seed garante ≥1 atribuição); sem isso o
    // allInnerTexts lê a tabela vazia e o teste flake.
    await expect(dirPage.locator("table tbody tr").first()).toBeVisible();
    const assignmentRows = await dirPage
      .locator("table tbody tr")
      .allInnerTexts();
    const assignedToTeacher = assignmentRows
      .filter((r) => r.includes(TEACHER_EMAIL))
      .map((r) => r.split("\t")[0]!.trim())
      .sort();
    await dirCtx.close();

    // O que a professora realmente enxerga.
    const teacherCtx = await browser.newContext({
      storageState: storageStatePath("teacher"),
    });
    const teacherPage = await teacherCtx.newPage();
    await teacherPage.goto("/students");
    await expect(
      teacherPage.getByRole("heading", { name: "Alunos", level: 1 }),
    ).toBeVisible();
    await expect(
      teacherPage.getByText("Mostrando apenas alunos atribuídos a você."),
    ).toBeVisible();
    await expect(
      teacherPage.locator("table tbody tr").first(),
    ).toBeVisible();
    const teacherSees = (await visibleStudentNames(teacherPage)).sort();
    await teacherCtx.close();

    // Invariante: a professora vê exatamente os alunos atribuídos a ela — nem a
    // mais (vazamento) nem a menos (filtragem excessiva).
    expect(teacherSees).toEqual(assignedToTeacher);
    // E vê pelo menos um aluno (senão o teste não prova filtragem de verdade).
    expect(assignedToTeacher.length).toBeGreaterThan(0);
  });
});

test.describe("Professora só vê estudos de alunos atribuídos (ADR-0002)", () => {
  test.use({ storageState: storageStatePath("teacher") });

  test("toda linha da listagem global pertence a aluno atribuído", async ({
    page,
  }) => {
    await page.goto("/case-studies");
    await expect(
      page.getByRole("heading", { name: "Estudos de caso", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Mostrando apenas estudos de alunos atribuídos a você."),
    ).toBeVisible();
    // Checagem barata (pode passar trivialmente com listagem vazia); a prova
    // forte do escopo está no teste E2E_WRITE abaixo, que cria dados.
    await expect(page.getByText(SEED_STUDENTS.unassigned)).toHaveCount(0);
    const rows = await page.locator("table tbody tr").allInnerTexts();
    for (const row of rows) {
      expect(row).toContain(SEED_STUDENTS.assigned);
    }
  });
});

test.describe("Escopo da listagem global com dados reais (E2E_WRITE=1)", () => {
  test.skip(
    !WRITE_ENABLED,
    "Cria estudos de caso no ambiente. Rode com E2E_WRITE=1.",
  );

  test("estudo de aluno não atribuído não aparece para a professora", async ({
    browser,
  }) => {
    // Pedagoga cria um estudo para cada aluno seed — inclusive o NÃO
    // atribuído (Bruno). Sem isso, o teste de escopo passa trivialmente.
    const pedCtx = await browser.newContext({
      storageState: storageStatePath("pedagogue"),
    });
    const pedPage = await pedCtx.newPage();
    for (const studentName of [
      SEED_STUDENTS.unassigned,
      SEED_STUDENTS.assigned,
    ]) {
      await pedPage.goto("/students");
      await pedPage
        .getByRole("row", { name: new RegExp(studentName) })
        .getByRole("link", { name: "Estudos de caso" })
        .click();
      await pedPage
        .getByRole("button", { name: "Novo estudo de caso" })
        .first()
        .click();
      await expect(
        pedPage.getByRole("heading", { name: "Estudo de caso", level: 1 }),
      ).toBeVisible();
      await expect(pedPage).toHaveURL(/\/case-studies\//);
    }
    // A pedagoga vê os estudos dos dois alunos na listagem global.
    await pedPage.goto("/case-studies");
    await expect(
      pedPage.getByText(SEED_STUDENTS.unassigned).first(),
    ).toBeVisible();
    await expect(
      pedPage.getByText(SEED_STUDENTS.assigned).first(),
    ).toBeVisible();
    await pedCtx.close();

    // A professora vê o estudo de Ana (atribuída) e NUNCA o de Bruno.
    const teacherCtx = await browser.newContext({
      storageState: storageStatePath("teacher"),
    });
    const teacherPage = await teacherCtx.newPage();
    await teacherPage.goto("/case-studies");
    await expect(
      teacherPage.getByRole("heading", { name: "Estudos de caso", level: 1 }),
    ).toBeVisible();
    await expect(
      teacherPage
        .getByRole("row", { name: new RegExp(SEED_STUDENTS.assigned) })
        .first(),
    ).toBeVisible();
    await expect(
      teacherPage.getByText(SEED_STUDENTS.unassigned),
    ).toHaveCount(0);
    await teacherCtx.close();
  });
});

test.describe("Diretora vê todos os alunos", () => {
  test.use({ storageState: storageStatePath("director") });

  test("vê os dois alunos seed e o cadastro", async ({ page }) => {
    await page.goto("/students");
    await expect(page.getByText(SEED_STUDENTS.assigned).first()).toBeVisible();
    await expect(page.getByText(SEED_STUDENTS.unassigned).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Novo aluno" }),
    ).toBeVisible();
  });
});
