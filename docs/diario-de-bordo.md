# Diário de bordo — horas por feature

Registro **append-only** do esforço gasto em cada entrega. Regras:

- **Todo PR adiciona uma linha** na seção do milestone correspondente, antes do merge (o review cobra).
- **Horas** = tempo de sessão da pessoa que conduziu. Frações em passos de 0,5h.
- Não editar entradas antigas (correções entram como nova linha com nota).
- Seções de M2–M8 são criadas quando o milestone começar.

## Setup — Organização da base

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-10 | Hugo | `1e7f337`…`69358c4` | _a preencher_ | Brainstorm da base, scaffold Better-T-Stack, docs/ADRs/glossário, CI + proteção de main, 8 milestones e 19 issues, AGENTS.md |

## M1 — Fundação técnica

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-11 | Hugo | #1 | 1,0 | Schema Drizzle do domínio + migration; `role` no user; `disableSignUp` |
| 2026-08-11 | Hugo | #2 | 0,5 | Módulo de policy de roles (matriz ADR-0002) + testes bun |
| 2026-08-11 | Hugo | #3 | 0,5 | Helper/middleware tRPC de auditoria (`withAuditedMutation` / `auditedProcedure`) |
| 2026-08-11 | Hugo | #4 | 0,5 | Seed de desenvolvimento (4 roles, alunos, perguntas, pdf_settings) |

## M2 — Login e gestão de usuários

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-11 | Hugo | #5 | 0,5 | Better Auth: login → audit_log; confirma disableSignUp + role |
| 2026-08-11 | Hugo | #6 | 0,5 | Tela de login única em português (sem cadastro) |
| 2026-08-11 | Hugo | #7 | 1,0 | CRUD usuários admin (create/update/desativar) + migration `active` |

## M3 — Alunos e atribuições

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-11 | Hugo | #8 | 1,0 | CRUD de alunos + remoção da coluna "Com IA" do diário |
| 2026-08-11 | Hugo | #9 | 0,5 | Atribuição aluno↔professora com filtro no servidor |

## M4 — Perguntas configuráveis

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-13 | Hugo | #10 | 1,0 | CRUD de perguntas (tipos, opções, ativar/desativar) + auditoria |
| 2026-08-13 | Hugo | #11 | 0,5 | UI de ordenação e agrupamento por seção (`sortOrder`) |
