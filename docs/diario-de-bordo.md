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
| 2026-08-23 | Hugo | #38 | 3,0 | Fundação de UI: tokens de status, primitivos Select/Table/Badge/Field, QueryState, camada de acesso `useRole`/`Can` (espelha policy), header com nav ativo/responsivo/gate por papel, dashboard e home reais; telas migradas para os primitivos. Identidade visual suave e acessível: acento azul (`--primary`/`--ring`), cantos arredondados, texto/alvos maiores, foco visível forte — tudo via tokens/primitivos |
| 2026-08-23 | Hugo | #40 | 0,5 | Redesign v2 (0/4): tokens do shell escuro (`--rail*`) e do estado de pendência âmbar (`--pending`); correção de contraste WCAG AA do texto secundário (`--muted-foreground` 4.48→~5.0:1) |
| 2026-08-23 | Hugo | #42 | 2,5 | Redesign v2 (1/4): `AppShell` com rail escuro + topbar + gaveta mobile (`Sheet` sobre base-ui dialog) + barra inferior; nav agrupada/filtrada por papel; home logada = `/dashboard` (remove "Início", `/` redireciona); variante de botão `outline-primary`; header antigo removido |
| 2026-08-23 | Hugo | #44 | 2,0 | Redesign v2 (2/4): tela Alunos no novo padrão — barra de controles (busca/filtro/contador), hierarquia de ações (`outline-primary` + ícones com tooltip), aviso da professora (`Callout`), form como toggle, cards no mobile, stub de PDF; status do estudo em standby (falta agregado no backend) |
| 2026-08-23 | Hugo | #46 | 1,0 | Redesign v2 (3/4): demais telas no padrão — container consistente (sai `container`), conteúdo em cards claros sobre o canvas (`Table` com `bg-card` + opção `bare`, seções e vazios com `bg-card`); corrige borda dupla da tabela em Alunos |
| 2026-08-23 | Hugo | #51 | 0,5 | Hotfix: tela branca em produção — `UserMenu` protegido contra `session.user` indefinido (optional chaining + fallback) |
| 2026-08-23 | Hugo | — | 0,5 | Correções do redesign encontradas ao rodar o app: canvas opaco (`--canvas`) no lugar de `bg-muted/40`, que compunha sobre o rail escuro e deixava o tema claro cinza e o texto secundário ilegível; rota de detalhe do aluno desaninhada (`students_.$studentId`) — antes a URL mudava mas a tela continuava na lista, pois `students.tsx` não tem `<Outlet />` |
| 2026-08-24 | Hugo | — | 2,0 | Refino visual das telas principais: casca de página compartilhada (`Page`/`PageHeader`/`Section`/`SectionLabel`) no lugar do cabeçalho duplicado em 6 telas; login centralizado com marca e cartão; painel com indicadores mais fortes e atalhos no lugar do vazio; formulário do estudo de caso em cards por seção com barra de salvar fixa; Perguntas e Usuários com formulário em toggle (padrão de Alunos); seta própria no `<select>` (`appearance-none` + SVG em `globals.css`) |
| 2026-08-24 | Hugo | — | 1,5 | Responsividade e estados vazios: tabelas de Alunos/Usuários/Perguntas/Atribuições viram cards abaixo de `lg` — o corte em `sm` era cedo demais porque o rail de 240px come a largura, e as colunas de ação (Desativar/Remover/Editar) ficavam fora da tela até ~1024px; barra de busca de Alunos empilha no mobile; `EmptyState` compartilhado (ícone + o que falta + ação) padroniza os seis vazios, que antes oscilavam entre `<Empty>` em card e um `<p>` cinza solto, nenhum com próximo passo; vazio de Atribuições passa a apontar o pré-requisito real (sem aluno ou sem professora, mandar "use o formulário acima" era enganoso) |
| 2026-08-24 | Hugo | — | 1,0 | Correção do 403 recorrente do `it_admin` (painel chamava `question.listActive`, que exige `viewCaseStudy`, para todos os papéis; o `QueryCache.onError` global virava o toast "Permissão negada"); salvar respostas volta para a lista de estudos de caso do aluno; seção da pergunta vira select das seções existentes + "Nova seção", evitando grupos duplicados por acento/caixa |
| 2026-08-29 | Hugo | #13 | 1,0 | Relatório livre da professora: mutation `caseStudy.saveFreeReport` auditada com before/after (`freeReport.update`), campo exposto só no detalhe (`byId`), seção própria na tela do estudo com salvamento independente das respostas; teste e2e de escrita |
| 2026-08-29 | Hugo | #14 | 1,0 | Consulta de estudos de caso por perfil: query `caseStudy.list` (join único, escopo da professora em SQL, `it_admin` FORBIDDEN), tela `/case-studies` com nav gated por `viewCaseStudy`; rename `case-studies_.$caseStudyId` (padrão de rota não aninhada); e2e de nav e de não-vazamento |
| 2026-08-29 | Hugo | #48 | 1,5 | Completude na lista de alunos: query `caseStudy.completionByStudent` (3 queries fixas + merge reusando `isBlankAnswerValue` — mesma régua do `saveAnswers`), coluna "Estudo de caso" com pílula Completo/Incompleto/Sem estudo (erro de carga vira "—", não "Sem estudo"), "N de M obrigatórias" e barra (`Progress` novo em packages/ui, variant `pending` no Badge); e2e do ciclo incompleto→completo |

## M8 — Deploy e operação

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-23 | Hugo | #18 | 0,5 | CI publica imagens `web` e `server` no Docker Hub após checks na `main` |
| 2026-08-23 | Hugo | #18 | 1,0 | Stack Portainer/Swarm (Traefik `extensao.hugogsilva.dev`) + migrate/seed no start da API |
| 2026-08-23 | Hugo | #18 | 0,5 | Fix imagem server: Bun resolve `better-auth` a partir da raiz do monorepo |
| 2026-08-29 | Hugo | #56 | 2,0 | Infra e2e Playwright (`apps/e2e`): smoke, auth, permissões (ADR-0002), responsivo e escrita opt-in (`E2E_WRITE`); sessões por perfil via `storageState`, retry de rate-limit do Better Auth |
