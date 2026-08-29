import { test as setup } from "@playwright/test";

import { ACCOUNTS, type RoleKey } from "./helpers/accounts";
import { loginAs, storageStatePath } from "./helpers/auth";

/**
 * Autentica cada perfil uma única vez e salva a sessão em `.auth/<role>.json`.
 * Os demais specs reutilizam esse estado (test.use({ storageState })), o que
 * evita repetir dezenas de logins — mais rápido e sem esbarrar no rate limit.
 */
const ROLES: RoleKey[] = ["director", "it_admin", "pedagogue", "teacher"];

for (const role of ROLES) {
  setup(`autenticar ${ACCOUNTS[role].roleLabel}`, async ({ page }) => {
    await loginAs(page, role);
    await page.context().storageState({ path: storageStatePath(role) });
    // Espaça os logins para respeitar o rate limit do Better Auth.
    await page.waitForTimeout(1500);
  });
}
