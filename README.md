# Auxílio Pedagógico

Plataforma para registro, acompanhamento e impressão de **estudos de caso de alunos com necessidades especiais**, construída para uso real em escola: controle de acesso por perfil, formulário configurável, relatório livre da professora, geração de PDF e **auditoria completa** das ações.

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [`docs/especificacao.md`](docs/especificacao.md) | Especificação funcional completa |
| [`docs/mvp.md`](docs/mvp.md) | Escopo da primeira entrega |
| [`docs/adr/`](docs/adr/) | Decisões de arquitetura (stack, permissões, auditoria, PDF, LGPD…) |
| [`docs/glossario.md`](docs/glossario.md) | Vocabulário do domínio pt↔en |
| [`docs/diario-de-bordo.md`](docs/diario-de-bordo.md) | Horas gastas por feature (uma entrada por PR) |

## Stack

Monorepo **Turborepo** ([ADR-0001](docs/adr/0001-stack-better-t-stack.md)):

- `apps/web` — React SPA (TanStack Router, shadcn/ui, Tailwind);
- `apps/server` — Hono + tRPC em Bun;
- `packages/db` — PostgreSQL + Drizzle ORM;
- `packages/auth` — Better Auth (sessões em banco, sem auto-cadastro);
- `packages/api`, `packages/ui`, `packages/env`, `packages/config` — código compartilhado.

## Como rodar

Pré-requisitos: [Bun](https://bun.sh) e Docker.

```bash
bun install

# variáveis de ambiente (nunca commitar os .env)
cp apps/server/.env.example apps/server/.env   # preencher BETTER_AUTH_SECRET
cp apps/web/.env.example apps/web/.env

bun run db:start   # Postgres via Docker
bun run db:push    # aplica o schema
bun run dev        # web em :3001, API em :3000
```

## Scripts úteis

- `bun run dev` / `dev:web` / `dev:server` — desenvolvimento;
- `bun run build` — build de todos os apps;
- `bun run check-types` — typecheck do monorepo;
- `bun run db:push` / `db:generate` / `db:migrate` / `db:studio` — banco.

## Contribuindo

- Trabalhe em branch e abra PR para `main` (branch protegida, CI obrigatória).
- Código em inglês, UI/commits/issues em português ([ADR-0007](docs/adr/0007-idioma-do-codigo.md)).
- Toda mutation nova deve gravar auditoria ([ADR-0004](docs/adr/0004-auditoria-append-only.md)).
