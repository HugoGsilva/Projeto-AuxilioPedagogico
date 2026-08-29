import { expect, type Page } from "@playwright/test";

import { ACCOUNTS, PASSWORD, type RoleKey, type SeedAccount } from "./accounts";

/** Caminho do storageState salvo por perfil (ver auth.setup.ts). */
export function storageStatePath(role: RoleKey): string {
  return `.auth/${role}.json`;
}

/** Preenche o formulário de login e clica em Entrar. Não espera navegação. */
export async function fillLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/**
 * Sinal robusto de login: chegou em /dashboard e o rail com o item "Painel"
 * está presente. Não depende do texto do cabeçalho (produção usa
 * "Olá, <perfil>"; o código atual usa "Painel").
 */
export async function expectLoggedIn(page: Page) {
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(
    page.getByRole("link", { name: "Painel" }).first(),
  ).toBeVisible();
}

/** Submete o login e devolve o status HTTP de /sign-in/email (429 = rate limit). */
async function submitLogin(
  page: Page,
  email: string,
  password: string,
): Promise<number | undefined> {
  const responsePromise = page
    .waitForResponse((r) => r.url().includes("/sign-in/email"), {
      timeout: 20_000,
    })
    .catch(() => null);
  await fillLogin(page, email, password);
  const response = await responsePromise;
  return response?.status();
}

/**
 * Loga com uma conta seed, tolerando o rate limit do Better Auth: em 429 espera
 * a janela (Retry-After, ou ~60s) e tenta de novo. Assim a suíte não quebra por
 * excesso de logins em série contra o ambiente compartilhado.
 */
export async function loginAs(page: Page, role: RoleKey): Promise<SeedAccount> {
  const account = ACCOUNTS[role];
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await submitLogin(page, account.email, PASSWORD);
    if (status === 429) {
      if (attempt === maxAttempts) {
        throw new Error(
          `Login de ${account.email} barrado por rate limit após ${maxAttempts} tentativas.`,
        );
      }
      // Rate limit do sign-in: ~3 tentativas por janela de ~10s. Espera a
      // janela reabrir (com margem) antes de tentar de novo.
      await page.waitForTimeout(12_000);
      continue;
    }
    await expectLoggedIn(page);
    return account;
  }
  return account;
}

/** Sai da conta pelo menu do usuário (botão com o nome) e volta ao login. */
export async function logout(page: Page, displayName: string) {
  await page
    .locator("header")
    .getByRole("button", { name: displayName })
    .click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

/** True quando os testes de escrita estão habilitados (E2E_WRITE=1). */
export const WRITE_ENABLED = process.env.E2E_WRITE === "1";

/** True quando o teste de snapshot (edita pergunta seed) está habilitado. */
export const SNAPSHOT_ENABLED = process.env.E2E_SNAPSHOT === "1";
