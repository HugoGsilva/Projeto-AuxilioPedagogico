# Diário de bordo — horas por feature

Registro **append-only** do esforço gasto em cada entrega. Regras:

- **Todo PR adiciona uma linha** na seção do milestone correspondente, antes do merge (o review cobra).
- **Horas** = tempo de sessão da pessoa que conduziu, incluindo o tempo pareando com IA (coluna "Com IA" indica se houve). Frações em passos de 0,5h.
- Não editar entradas antigas (correções entram como nova linha com nota).
- Seções de M2–M8 são criadas quando o milestone começar.

## Setup — Organização da base

| Data | Dev | Com IA | Ref | Horas | Notas |
| --- | --- | --- | --- | --- | --- |
| 2026-08-10 | Hugo | Sim | `1e7f337`…`69358c4` | _a preencher_ | Brainstorm da base, scaffold Better-T-Stack, docs/ADRs/glossário, CI + proteção de main, 8 milestones e 19 issues, AGENTS.md |

## M1 — Fundação técnica

| Data | Dev | Com IA | Ref | Horas | Notas |
| --- | --- | --- | --- | --- | --- |
| 2026-08-11 | Hugo | Sim | #1 | 1,0 | Schema Drizzle do domínio + migration; `role` no user; `disableSignUp` (fix Bugbot) |
| 2026-08-11 | Hugo | Sim | #2 | 0,5 | Módulo de policy de roles (matriz ADR-0002) + testes bun |
| 2026-08-11 | Hugo | Sim | #3 | 0,5 | Helper/middleware tRPC de auditoria (`withAuditedMutation` / `auditedProcedure`) |
