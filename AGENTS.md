# Projeto Auxílio Pedagógico — guia para devs e agentes de IA

Sistema de acompanhamento de alunos com necessidades especiais para uma escola (single-tenant, produção real, **dados sensíveis de crianças**). Este arquivo é a fonte única de convenções para qualquer ferramenta de IA (Claude Code, Cursor, Codex, Copilot…) e para humanos.

## Onde está a verdade (consultar no início da sessão)

Não existe arquivo de status — o estado vivo do projeto está em:

| O quê | Onde | Como consultar |
| --- | --- | --- |
| Backlog | Issues/milestones do GitHub | `gh issue list --milestone "M1 — Fundação técnica"` (milestones M1→M8) |
| O que já foi feito | Histórico do git e PRs | `git log --oneline -20`, `gh pr list --state merged` |
| Decisões de arquitetura | `docs/adr/` | Ler antes de propor mudança estrutural; decisão nova = ADR novo |
| Requisitos | `docs/especificacao.md` | Spec funcional completa |
| Escopo da 1ª entrega | `docs/mvp.md` | O que está dentro e fora do MVP |
| Vocabulário | `docs/glossario.md` | Termos pt↔en obrigatórios |

## Acordos de trabalho para sessões de IA

1. **Puxe trabalho do backlog**: escolha uma issue do milestone aberto mais baixo (M1 primeiro). Não invente escopo — se algo parecer necessário e não houver issue, proponha criar uma antes de codar.
2. **Uma issue = um branch = um PR** para `main` (protegida; check `ci` obrigatório). Referencie a issue no PR (`Closes #N`).
3. **Antes de commitar**: `bun run check-types` deve passar. A CI roda typecheck + build.
4. **Toda mutation tRPC grava auditoria** via middleware/helper (ADR-0004). Mutation sem auditoria é bug de review.
5. **Nunca leia, escreva ou commite `.env`/segredos.** Variável nova entra no `.env.example` (placeholder) e no schema de `packages/env`.
6. **Permissões**: verificação sempre no servidor via módulo de policy (ADR-0002), nunca só na UI. `it_admin` não acessa dados de alunos; `teacher` só vê alunos atribuídos.
7. **Snapshot de perguntas** (ADR-0003): documentos antigos exibem o snapshot, nunca o texto atual da pergunta.
8. **Não desfaça decisões de ADR silenciosamente** — se discordar, discuta com o time e registre um ADR substituto.
9. **Diário de bordo**: todo PR adiciona uma linha em `docs/diario-de-bordo.md` (data, dev, com IA, ref, horas, notas) na seção do milestone correspondente.

## Regras de commit (obrigatórias)

- Autor: a conta do próprio dev. **Nunca adicionar `Co-Authored-By`** nem qualquer trailer de co-autoria de IA.
- Conventional commits com mensagem em **português** (`feat: cadastro de alunos`).

## Idioma (ADR-0007)

- **Inglês:** código, tabelas, colunas, rotas tRPC, nomes de arquivos de código.
- **Português:** UI, mensagens ao usuário, docs, issues, PRs e commits.
- Termos do domínio exatamente como no `docs/glossario.md`: `student`, `caseStudy`, `question`, `answer`, `freeReport`, `auditLog`, `studentAssignment` — sem sinônimos.

## Stack

Monorepo Turborepo + Bun: `apps/web` (React SPA, TanStack Router, shadcn/ui, Tailwind), `apps/server` (Hono + tRPC), `packages/db` (Postgres + Drizzle), `packages/auth` (Better Auth, sessões em banco, sem auto-cadastro), `packages/api` (routers tRPC), `packages/ui`, `packages/env`, `packages/config`.

PDF: template HTML/CSS convertido pelo container **Gotenberg** na rede interna (ADR-0005) — não usar Puppeteer no server.

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

## Frontend

Usar primitivas compartilhadas de `packages/ui`; adicionar componentes com `npx shadcn@latest add <comp> -c packages/ui`. UI inteira em português.
