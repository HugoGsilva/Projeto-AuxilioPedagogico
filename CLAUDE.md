# Projeto Auxílio Pedagógico

Sistema de acompanhamento de alunos com necessidades especiais para uma escola (single-tenant, produção real, dados sensíveis de crianças). Fonte de verdade: `docs/especificacao.md` (spec), `docs/mvp.md` (escopo) e `docs/adr/` (decisões — ler antes de propor mudança de arquitetura).

## Stack

Monorepo Turborepo + Bun: `apps/web` (React SPA, TanStack Router, shadcn/ui, Tailwind), `apps/server` (Hono + tRPC), `packages/db` (Postgres + Drizzle), `packages/auth` (Better Auth), `packages/api` (routers tRPC), `packages/ui`, `packages/env`, `packages/config`.

## Comandos

```bash
bun install            # dependências
bun run dev            # web :3001 + API :3000
bun run check-types    # typecheck (obrigatório antes de commit)
bun run build          # build completo
bun run db:start       # Postgres via Docker
bun run db:push        # aplicar schema (dev)
bun run db:generate    # gerar migrações Drizzle
bun run db:studio      # UI do banco
```

## Regras de commit (obrigatórias)

- Autor: conta do usuário (HugoGsilva). **Nunca adicionar `Co-Authored-By`** nem qualquer trailer de co-autoria.
- Conventional commits com mensagem em **português** (`feat: cadastro de alunos`).
- Nunca commitar `.env` ou segredos; `.env.example` com placeholders é o padrão.

## Convenções

- **Idioma (ADR-0007):** código/tabelas/rotas em inglês; UI, docs, issues, PRs e commits em português. Vocabulário do domínio: `docs/glossario.md` — usar exatamente os termos de lá (`student`, `caseStudy`, `question`, `answer`, `freeReport`, `auditLog`, `studentAssignment`).
- **Permissões (ADR-0002):** 4 roles fixas (`director`, `it_admin`, `pedagogue`, `teacher`) em módulo de policy único e testado. `it_admin` não acessa dados de alunos; `teacher` só vê alunos atribuídos. Sem auto-cadastro.
- **Auditoria (ADR-0004):** toda mutation tRPC grava em `audit_log` (append-only, mesma transação) via middleware/helper — mutation nova sem auditoria é bug de review.
- **Perguntas (ADR-0003):** resposta grava snapshot do enunciado/tipo/opções; nunca exibir documento antigo com texto atual da pergunta.
- **PDF (ADR-0005):** template HTML/CSS convertido pelo container Gotenberg (rede interna); não usar Puppeteer no server.
- **Frontend:** usar primitivas compartilhadas de `packages/ui`; adicionar componentes com `npx shadcn@latest add <comp> -c packages/ui`.

## Processo

- Branch + PR para `main` (protegida; CI de typecheck/build deve passar).
- Issues e milestones no GitHub em português definem o backlog do MVP.
