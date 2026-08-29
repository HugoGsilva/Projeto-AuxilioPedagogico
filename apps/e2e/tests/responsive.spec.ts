import { expect, type Page, test } from "@playwright/test";

import { SEED_STUDENTS } from "./helpers/accounts";
import { storageStatePath } from "./helpers/auth";

/** Garante que a página não gera rolagem horizontal (layout não estoura). */
async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  // Tolerância de 1px para arredondamento sub-pixel.
  expect(overflow, "rolagem horizontal inesperada").toBeLessThanOrEqual(1);
}

test.describe("Login no celular (~390px)", () => {
  test("é usável e sem rolagem horizontal", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByLabel("E-mail");
    const senha = page.getByLabel("Senha");
    await expect(email).toBeVisible();
    await expect(senha).toBeVisible();
    await email.fill("diretor@escola.local");
    await senha.fill("x");
    await expect(email).toHaveValue("diretor@escola.local");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});

test.describe("App autenticado no celular (~390px)", () => {
  test.use({ storageState: storageStatePath("director") });

  test("barra inferior + menu-sanduíche navegam", async ({ page }) => {
    await page.goto("/dashboard");
    await expectNoHorizontalScroll(page);

    // A sidebar de desktop fica oculta abaixo de sm.
    await expect(page.locator("aside")).toBeHidden();

    const bottomNav = page.locator("nav").last();
    await expect(bottomNav.getByText("Painel")).toBeVisible();
    await expect(bottomNav.getByText("Alunos")).toBeVisible();
    await expect(bottomNav.getByRole("button", { name: "Mais" })).toBeVisible();

    // Abre o menu completo e navega para um item fora da barra inferior.
    await bottomNav.getByRole("button", { name: "Mais" }).click();
    const sheetLink = page.getByRole("link", { name: "Usuários" });
    await expect(sheetLink).toBeVisible();
    await sheetLink.click();
    await expect(
      page.getByRole("heading", { name: "Usuários", level: 1 }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("lista de alunos usável no mobile, sem estourar largura", async ({
    page,
  }) => {
    await page.goto("/students");
    await expect(
      page.getByRole("heading", { name: "Alunos", level: 1 }),
    ).toBeVisible();
    // No mobile a tabela desktop fica oculta (presente no DOM); o nome visível
    // é o do card. Filtra pelo elemento efetivamente visível.
    await expect(
      page.getByText(SEED_STUDENTS.assigned).filter({ visible: true }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
