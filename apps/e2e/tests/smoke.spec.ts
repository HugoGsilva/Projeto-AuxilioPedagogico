import { expect, test } from "@playwright/test";

/** Sanidade do ambiente: HTTPS abre e a tela de login renderiza. */
test.describe("Smoke", () => {
  test("HTTPS abre a tela de login sem erro de certificado", async ({
    page,
  }) => {
    // Playwright falharia o goto num certificado inválido (ignoreHTTPSErrors=false).
    const response = await page.goto("/login");
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("raiz redireciona visitante não autenticado para o login", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});
