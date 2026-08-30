import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    /** URL interna do Gotenberg (ADR-0005). Ausente = geração de PDF indisponível. */
    GOTENBERG_URL: z.url().optional(),
    /**
     * Bootstrap da conta "mãe" de diretora no deploy (opcional; idempotente).
     * Sem validação fina aqui: este schema roda no import de qualquer script
     * (inclusive migrate.ts, o 1º do entrypoint) e um valor inválido viraria
     * "Postgres indisponível" no log. Formato/tamanho são validados com
     * mensagem clara em packages/db/src/bootstrap-director.ts.
     */
    BOOTSTRAP_DIRECTOR_EMAIL: z.string().optional(),
    BOOTSTRAP_DIRECTOR_PASSWORD: z.string().optional(),
    BOOTSTRAP_DIRECTOR_NAME: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
