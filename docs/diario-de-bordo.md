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

## M5 — Estudo de caso

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-22 | Hugo | #12 | 2,0 | Formulário do estudo de caso com snapshot da pergunta (ADR-0003) |
| 2026-08-23 | Hugo | #38 | _a preencher_ | Fundação de UI: tokens de status, primitivos Select/Table/Badge/Field, QueryState, camada de acesso `useRole`/`Can` (espelha policy), header com nav ativo/responsivo/gate por papel, dashboard e home reais; telas migradas para os primitivos. Identidade visual suave e acessível: acento azul (`--primary`/`--ring`), cantos arredondados, texto/alvos maiores, foco visível forte — tudo via tokens/primitivos |
| 2026-08-23 | Hugo | #40 | _a preencher_ | Redesign v2 (0/4): tokens do shell escuro (`--rail*`) e do estado de pendência âmbar (`--pending`); correção de contraste WCAG AA do texto secundário (`--muted-foreground` 4.48→~5.0:1) |
| 2026-08-23 | Hugo | #42 | _a preencher_ | Redesign v2 (1/4): `AppShell` com rail escuro + topbar + gaveta mobile (`Sheet` sobre base-ui dialog) + barra inferior; nav agrupada/filtrada por papel; home logada = `/dashboard` (remove "Início", `/` redireciona); variante de botão `outline-primary`; header antigo removido |
| 2026-08-23 | Hugo | #44 | _a preencher_ | Redesign v2 (2/4): tela Alunos no novo padrão — barra de controles (busca/filtro/contador), hierarquia de ações (`outline-primary` + ícones com tooltip), aviso da professora (`Callout`), form como toggle, cards no mobile, stub de PDF; status do estudo em standby (falta agregado no backend) |
| 2026-08-23 | Hugo | #46 | _a preencher_ | Redesign v2 (3/4): demais telas no padrão — container consistente (sai `container`), conteúdo em cards claros sobre o canvas (`Table` com `bg-card` + opção `bare`, seções e vazios com `bg-card`); corrige borda dupla da tabela em Alunos |

## M8 — Deploy e operação

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-23 | Hugo | #18 | 0,5 | CI publica imagens `web` e `server` no Docker Hub após checks na `main` |
| 2026-08-23 | Hugo | #18 | 1,0 | Stack Portainer/Swarm (Traefik `extensao.hugogsilva.dev`) + migrate/seed no start da API |
| 2026-08-23 | Hugo | #18 | 0,5 | Fix imagem server: Bun resolve `better-auth` a partir da raiz do monorepo |
