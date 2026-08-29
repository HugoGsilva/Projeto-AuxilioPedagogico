import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Carrega `.env` (deste pacote) sem depender de dotenv. Variáveis já presentes
 * no ambiente têm prioridade — o que permite sobrescrever no CI ou na linha de
 * comando (`E2E_WRITE=1 bun run test:e2e`).
 */
function loadEnv() {
  const file = resolve(__dirname, ".env");
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv();

const baseURL = process.env.E2E_BASE_URL ?? "https://extensao.hugogsilva.dev";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  // Maior que o backoff de rate limit (~60s) para caber uma nova tentativa.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      // O layout mobile (barra inferior, menu-sanduíche) só existe abaixo de sm.
      testIgnore: /(responsive\.spec|auth\.setup)\.ts/,
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
});
