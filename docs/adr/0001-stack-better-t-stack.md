# ADR-0001 — Stack: Better-T-Stack (monorepo TypeScript)

- **Status:** aceita
- **Data:** 2026-08-10

## Contexto

Sistema para produção real em uma escola, equipe de 2–3 devs, deploy em VPS com Docker. Preferência do time por TypeScript de ponta a ponta. Foi considerado um monolito Next.js, mas o time optou pelo scaffold Better-T-Stack.

## Decisão

Monorepo **Turborepo** gerado com `create-better-t-stack`:

- **Frontend:** React SPA com TanStack Router + shadcn/ui + Tailwind (`apps/web`);
- **Backend:** Hono + tRPC rodando em **Bun** (`apps/server`);
- **Banco:** PostgreSQL + Drizzle ORM (`packages/db`), Postgres via Docker no dev;
- **Auth:** Better Auth (`packages/auth`) — ver ADR-0002;
- **Pacotes compartilhados:** `api` (routers tRPC), `ui`, `env`, `config`.

## Consequências

- Type-safety de ponta a ponta (tRPC + Drizzle + Zod) sem codegen de API.
- Sem SSR — irrelevante para sistema interno atrás de login.
- Dois artefatos de deploy (web estático + server), orquestrados num único Docker Compose.
- A equipe precisa dominar tRPC, Drizzle e Bun.
- Geração de PDF não roda Chromium dentro do runtime Bun — ver ADR-0005.
