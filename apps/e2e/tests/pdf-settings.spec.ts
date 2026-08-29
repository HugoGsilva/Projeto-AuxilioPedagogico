import { expect, test } from "@playwright/test";

import { storageStatePath, WRITE_ENABLED } from "./helpers/auth";

test.describe("Configuração do PDF — acesso negado (ADR-0002)", () => {
  test.use({ storageState: storageStatePath("pedagogue") });

  test("pedagoga não acessa /pdf-settings nem por URL direta", async ({
    page,
  }) => {
    await page.goto("/pdf-settings");
    await expect(
      page.getByRole("heading", { name: "Configuração do PDF", level: 1 }),
    ).toBeVisible();
    // O servidor nega a leitura com 403 e o form não aparece.
    await expect(
      page.getByRole("main").getByText(/Permissão negada/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Salvar configuração" }),
    ).toHaveCount(0);
  });
});

test.describe("Configuração do PDF — edição (E2E_WRITE=1)", () => {
  test.skip(
    !WRITE_ENABLED,
    "Edita o singleton de configuração. Rode com E2E_WRITE=1.",
  );
  test.use({ storageState: storageStatePath("director") });

  test("diretora edita, persiste e restaura o nome da escola", async ({
    page,
  }) => {
    await page.goto("/pdf-settings");
    const nameField = page.getByLabel("Nome da escola");
    await expect(nameField).toBeVisible();
    // O form semeia via effect logo após a query resolver; espera o valor
    // (seed garante nome não vazio) para não ler/gravar no meio da semeadura.
    await expect(nameField).not.toHaveValue("");
    const original = await nameField.inputValue();
    const marker = `${original} [e2e]`.slice(0, 200);

    try {
      await nameField.fill(marker);
      await page.getByRole("button", { name: "Salvar configuração" }).click();
      await expect(page.getByText("Configuração salva").first()).toBeVisible();

      // Round-trip real: recarrega e confere a persistência.
      await page.reload();
      await expect(page.getByLabel("Nome da escola")).toHaveValue(marker);
    } finally {
      // Singleton compartilhado do ambiente: restaura o valor original.
      await page.reload();
      const field = page.getByLabel("Nome da escola");
      await expect(field).toBeVisible();
      if ((await field.inputValue()) !== original) {
        await field.fill(original);
        await page
          .getByRole("button", { name: "Salvar configuração" })
          .click();
        await expect(
          page.getByText("Configuração salva").first(),
        ).toBeVisible();
      }
    }
  });
});
