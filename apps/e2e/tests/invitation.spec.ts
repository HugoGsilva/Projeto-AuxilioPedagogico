import { expect, type Page, test } from "@playwright/test";

import { ACCOUNTS } from "./helpers/accounts";
import { storageStatePath, WRITE_ENABLED } from "./helpers/auth";

/**
 * Fluxo de convites (issue #67). Cria convites e contas reais no ambiente, então
 * só roda com E2E_WRITE=1. Cada teste usa um e-mail único (timestamp) para não
 * colidir com o índice único parcial de convite pendente por e-mail nem com
 * contas de execuções anteriores.
 */
test.describe("Convites de usuário (E2E_WRITE=1)", () => {
  test.skip(
    !WRITE_ENABLED,
    "Cria convites e contas no ambiente. Rode com E2E_WRITE=1.",
  );

  function uniqueEmail(prefix: string): string {
    return `${prefix}+${Date.now()}@escola.local`;
  }

  /** Extrai só o path+token do link gerado, para navegar no baseURL do teste. */
  function invitePath(inviteUrl: string): string {
    const url = new URL(inviteUrl);
    return `${url.pathname}${url.search}`;
  }

  /**
   * Abre o formulário de convite, preenche e gera. Devolve o link exibido no
   * callout (só existe neste instante — o banco guarda apenas o hash).
   */
  async function createInvite(
    page: Page,
    data: { name: string; email: string; role?: string },
  ): Promise<string> {
    await page.goto("/users");
    await expect(
      page.getByRole("heading", { name: "Usuários", level: 1 }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Convidar" }).first().click();
    await page.getByLabel("Nome").fill(data.name);
    await page.getByLabel("E-mail").fill(data.email);
    if (data.role) await page.getByLabel("Perfil").selectOption(data.role);
    await page.getByRole("button", { name: "Gerar convite" }).click();

    // O callout de link só aparece em sucesso.
    await expect(page.getByText("Convite criado — copie o link agora")).toBeVisible();
    const link = await page.locator("input.font-mono").first().inputValue();
    expect(link).toContain("/convite?token=");
    return link;
  }

  test("ciclo feliz: convida, aceita, entra logada e o link não serve de novo", async ({
    browser,
  }) => {
    const email = uniqueEmail("professora-convite");
    const name = "Professora Convidada";

    // Diretora gera o convite.
    const dirCtx = await browser.newContext({
      storageState: storageStatePath("director"),
    });
    const dirPage = await dirCtx.newPage();
    const inviteUrl = await createInvite(dirPage, {
      name,
      email,
      role: "teacher",
    });
    const path = invitePath(inviteUrl);

    // Convidada abre o link num contexto anônimo (sem sessão).
    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto(path);
    await expect(guestPage.getByText("Você foi convidada como")).toBeVisible();
    await expect(guestPage.getByText("Professora")).toBeVisible();
    await expect(guestPage.getByText(email)).toBeVisible();

    // O nome vem semeado; define a senha e conclui.
    await expect(guestPage.getByLabel("Seu nome")).toHaveValue(name);
    await guestPage.getByLabel("Crie sua senha").fill("Convite@123");
    await guestPage
      .getByRole("button", { name: "Criar conta e entrar" })
      .click();

    // Já entra logada (redirect duro para /dashboard).
    await expect(guestPage).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
    await expect(
      guestPage.getByRole("link", { name: "Painel" }).first(),
    ).toBeVisible();
    await guestCtx.close();

    // O mesmo link não serve mais: convite consumido → cartão genérico.
    const reuseCtx = await browser.newContext();
    const reusePage = await reuseCtx.newPage();
    await reusePage.goto(path);
    await expect(
      reusePage.getByRole("heading", { name: "Convite indisponível" }),
    ).toBeVisible();
    await reuseCtx.close();

    // Limpeza best-effort: desativa a conta criada para não acumular no ambiente.
    try {
      await dirPage.goto("/users");
      const row = dirPage.getByRole("row", { name: new RegExp(email) });
      await row.getByRole("button", { name: "Desativar" }).click();
      await expect(row.getByText("Desativado")).toBeVisible({ timeout: 5_000 });
    } catch {
      // Não falha o teste se a limpeza não completar.
    }
    await dirCtx.close();
  });

  test("revogar invalida o link antes do aceite", async ({ browser }) => {
    const email = uniqueEmail("revogado");

    const dirCtx = await browser.newContext({
      storageState: storageStatePath("director"),
    });
    const dirPage = await dirCtx.newPage();
    const inviteUrl = await createInvite(dirPage, {
      name: "Convite Revogado",
      email,
      role: "teacher",
    });
    const path = invitePath(inviteUrl);

    // Revoga na lista de pendentes.
    await dirPage.getByRole("button", { name: "Fechar" }).click();
    const pendingRow = dirPage
      .getByRole("listitem")
      .filter({ hasText: email });
    await expect(pendingRow).toBeVisible();
    await pendingRow.getByRole("button", { name: "Revogar" }).click();
    await expect(dirPage.getByText(email)).toHaveCount(0);
    await dirCtx.close();

    // Link revogado → cartão genérico.
    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto(path);
    await expect(
      guestPage.getByRole("heading", { name: "Convite indisponível" }),
    ).toBeVisible();
    await guestCtx.close();
  });

  test("convidar e-mail de conta existente é bloqueado", async ({ browser }) => {
    const dirCtx = await browser.newContext({
      storageState: storageStatePath("director"),
    });
    const dirPage = await dirCtx.newPage();
    await dirPage.goto("/users");
    await dirPage.getByRole("button", { name: "Convidar" }).first().click();
    await dirPage.getByLabel("Nome").fill("Diretora de novo");
    await dirPage.getByLabel("E-mail").fill(ACCOUNTS.director.email);
    await dirPage.getByRole("button", { name: "Gerar convite" }).click();

    // Erro (toast) e nenhum link gerado.
    await expect(
      dirPage.locator("[data-sonner-toast]").first(),
    ).toBeVisible();
    await expect(
      dirPage.getByText("Convite criado — copie o link agora"),
    ).toHaveCount(0);
    await dirCtx.close();
  });

  test("TI não convida — só a diretora (ADR-0002)", async ({ browser }) => {
    const tiCtx = await browser.newContext({
      storageState: storageStatePath("it_admin"),
    });
    const tiPage = await tiCtx.newPage();
    await tiPage.goto("/users");
    await expect(
      tiPage.getByRole("heading", { name: "Usuários", level: 1 }),
    ).toBeVisible();
    // O TI vê e gerencia contas (a lista renderiza), mas não tem ação de
    // convite — só a diretora convida.
    await expect(
      tiPage.getByRole("button", { name: "Convidar" }),
    ).toHaveCount(0);
    await tiCtx.close();
  });
});
