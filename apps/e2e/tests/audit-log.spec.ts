import { expect, test } from "@playwright/test";

import { ACCOUNTS, SEED_STUDENTS } from "./helpers/accounts";
import { storageStatePath, WRITE_ENABLED } from "./helpers/auth";

test.describe("Auditoria — professora vê só as próprias ações (ADR-0002)", () => {
  test.use({ storageState: storageStatePath("teacher") });

  test("toda linha pertence à própria professora", async ({ page }) => {
    await page.goto("/audit-log");
    await expect(
      page.getByRole("heading", { name: "Auditoria", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Mostrando apenas as suas ações.")).toBeVisible();
    // O filtro de usuário não existe para a professora.
    await expect(page.getByLabel("Usuário")).toHaveCount(0);

    // O login do setup garante pelo menos uma linha própria.
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const texts = await rows.allInnerTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) {
      expect(text).toContain(ACCOUNTS.teacher.name);
    }
  });
});

test.describe("Auditoria — paginação", () => {
  test.use({ storageState: storageStatePath("director") });

  test("carregar mais aumenta a lista", async ({ page }) => {
    await page.goto("/audit-log");
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    const loadMore = page.getByRole("button", { name: "Carregar mais" });
    // Só assere quando há mais de uma página (depende do volume do ambiente).
    if ((await loadMore.count()) > 0) {
      const before = await rows.count();
      await loadMore.click();
      await expect.poll(async () => rows.count()).toBeGreaterThan(before);
    }
  });
});

test.describe("Auditoria — redação para TI e visão da diretora (E2E_WRITE=1)", () => {
  test.skip(
    !WRITE_ENABLED,
    "Gera uma edição de aluno para asserir a redação. Rode com E2E_WRITE=1.",
  );

  test("TI vê a linha do aluno sem valores; diretora vê os valores", async ({
    browser,
  }) => {
    // 1) Pedagoga edita o cadastro da Ana (gera student.update com o nome
    //    do aluno no before/after).
    const pedCtx = await browser.newContext({
      storageState: storageStatePath("pedagogue"),
    });
    const pedPage = await pedCtx.newPage();
    await pedPage.goto("/students");
    await pedPage
      .getByRole("row", { name: new RegExp(SEED_STUDENTS.assigned) })
      .getByRole("button", { name: /Editar cadastro/ })
      .click();
    await pedPage.getByRole("button", { name: "Salvar" }).click();
    await expect(pedPage.getByText("Aluno atualizado")).toBeVisible();
    await pedCtx.close();

    // 2) TI: a linha existe, mas o conteúdo é protegido e o nome do aluno
    //    não aparece em lugar nenhum da página.
    const tiCtx = await browser.newContext({
      storageState: storageStatePath("it_admin"),
    });
    const tiPage = await tiCtx.newPage();
    await tiPage.goto("/audit-log");
    await tiPage.getByLabel("Entidade").selectOption("student");
    const tiRows = tiPage.locator("table tbody tr");
    await expect(tiRows.first()).toBeVisible();
    await expect(
      tiPage.getByText("Dados protegidos").first(),
    ).toBeVisible();
    await expect(tiPage.getByText(SEED_STUDENTS.assigned)).toHaveCount(0);
    await expect(tiPage.getByText("Ver alteração")).toHaveCount(0);
    await tiCtx.close();

    // 3) Diretora: mesma linha com o conteúdo visível.
    const dirCtx = await browser.newContext({
      storageState: storageStatePath("director"),
    });
    const dirPage = await dirCtx.newPage();
    await dirPage.goto("/audit-log");
    await dirPage.getByLabel("Entidade").selectOption("student");
    await expect(
      dirPage.locator("table tbody tr").first(),
    ).toBeVisible();
    await dirPage.getByText("Ver alteração").first().click();
    await expect(
      dirPage.getByText(SEED_STUDENTS.assigned).first(),
    ).toBeVisible();
    await dirCtx.close();
  });
});
