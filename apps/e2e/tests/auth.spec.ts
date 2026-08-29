import { expect, test } from "@playwright/test";

import { ACCOUNTS, PASSWORD } from "./helpers/accounts";
import {
  expectLoggedIn,
  fillLogin,
  loginAs,
  logout,
  storageStatePath,
} from "./helpers/auth";

/**
 * O login de cada um dos 4 perfis já é exercitado (e falharia a suíte inteira
 * se quebrasse) no setup, que autentica todos e salva a sessão. O logout é
 * agnóstico de papel, então é validado uma vez aqui com um login fresco — o que
 * também não invalida as sessões salvas reutilizadas pelos demais specs.
 */
test.describe("Login", () => {
  test("fluxo completo de login e logout", async ({ page }) => {
    const account = await loginAs(page, "director");
    await expect(
      page.locator("header").getByRole("button", { name: account.name }),
    ).toBeVisible();
    await logout(page, account.name);
  });

  test("senha errada mantém no login e mostra erro", async ({ page }) => {
    const responsePromise = page
      .waitForResponse((r) => r.url().includes("/sign-in/email"), {
        timeout: 20_000,
      })
      .catch(() => null);
    await fillLogin(page, ACCOUNTS.director.email, "senhaErrada123");
    const response = await responsePromise;

    // O servidor não autentica (não é 2xx) e a UI continua no login.
    if (response) expect(response.ok()).toBeFalsy();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    // Um toast de erro (credencial inválida ou rate limit) é exibido.
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
  });

  test("validação de e-mail bloqueia o envio no cliente", async ({ page }) => {
    // A validação do cliente deve impedir a chamada de rede de login com um
    // e-mail malformado (robusto ao texto exato da mensagem, que varia entre
    // versões do formulário).
    let signInCalled = false;
    page.on("request", (r) => {
      if (r.url().includes("/sign-in/email")) signInCalled = true;
    });
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("nao-e-email");
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/login$/);
    expect(signInCalled, "login não deveria ser chamado com e-mail inválido").toBeFalsy();
  });
});

test.describe("Sessão persiste", () => {
  test.use({ storageState: storageStatePath("director") });

  test("segue autenticado após recarregar a página", async ({ page }) => {
    await page.goto("/dashboard");
    await expectLoggedIn(page);
    await page.reload();
    // O cookie de sessão sobrevive ao reload: continua no painel.
    await expectLoggedIn(page);
  });
});
