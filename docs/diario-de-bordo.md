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

## M6 — Geração de PDF

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-29 | Hugo | #16 | 1,0 | Configuração dos dados da escola no PDF: router `pdfSettings` (get + update auditado com before/after, upsert idempotente do singleton, gate `configurePdfSettings`), tela `/pdf-settings` (nome + dados institucionais — cabeçalho/rodapé ficam fora do MVP conforme mvp.md), nav para diretora/TI; e2e de 403 da pedagoga e de round-trip com restauração |
| 2026-08-29 | Hugo | #49 | 0,5 | Botão "Gerar PDF" real na lista de alunos: usa o estudo mais recente (`completionByStudent`), habilita só com estudo completo (tooltip explica), download via Blob com toast de sucesso/erro; e2e do download com o mock do Gotenberg |
| 2026-08-29 | Hugo | #15 | 2,0 | Template HTML + Gotenberg (ADR-0005): módulo `packages/api/src/pdf` (template TS com escape obrigatório e snapshot ADR-0003, formatação pt-BR; cliente com timeout e validação `%PDF`) + testes unitários; mutation `caseStudy.generatePdf` (gate `generatePdf`, conversão fora da transação, auditoria `pdfGeneration.create` só no sucesso, retorno base64); `GOTENBERG_URL` opcional no env; serviço `gotenberg` no stack (rede interna); mock local para dev sem Docker. UI liga no #49 |

## M7 — Histórico de auditoria

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-29 | Hugo | #17 | 1,5 | Tela de auditoria: router `auditLog` (list com keyset por `(createdAt,id)`, filtros usuário/entidade/ação/período, escopo em SQL — professora presa ao próprio `userId` — e redação por linha para TI via `canViewAuditEntry`; `userOptions` para o filtro), tela `/audit-log` com rótulos PT, detalhes expandíveis e "Carregar mais"; testes unitários da redação e e2e (professora só vê as próprias; TI vê linha de aluno sem valores; diretora vê tudo). Pedagoga = acesso completo, seguindo a policy vigente (mudança exigiria ADR) |

## M8 — Deploy e operação

| Data | Dev | Ref | Horas | Notas |
| --- | --- | --- | --- | --- |
| 2026-08-23 | Hugo | #18 | 0,5 | CI publica imagens `web` e `server` no Docker Hub após checks na `main` |
| 2026-08-23 | Hugo | #18 | 1,0 | Stack Portainer/Swarm (Traefik `extensao.hugogsilva.dev`) + migrate/seed no start da API |
| 2026-08-23 | Hugo | #18 | 0,5 | Fix imagem server: Bun resolve `better-auth` a partir da raiz do monorepo |
| 2026-08-29 | Hugo | #56 | 2,0 | Infra e2e Playwright (`apps/e2e`): smoke, auth, permissões (ADR-0002), responsivo e escrita opt-in (`E2E_WRITE`); sessões por perfil via `storageState`, retry de rate-limit do Better Auth |
| 2026-08-29 | Hugo | #19 | 1,0 | Backup diário criptografado off-site (ADR-0006): serviço `backup` no stack (pg_dump -Fc → openssl aes-256-cbc pbkdf2 → rclone S3, retenção 30d, healthcheck de 36h, recusa placeholders TROCAR_*, só rede interna); `docs/backup.md` com setup e runbook de restore; teste de restore executado localmente (round-trip criptográfico byte-idêntico + contagens idênticas pós-pg_restore) |
| 2026-08-29 | Hugo | #67 | 2,0 | Convite de usuários: diretora/TI convida (nome+email+papel) → link copiável (conta Pendente na tela de Usuários, regenerar/revogar) → página pública `/convite` valida token e a pessoa define a própria senha → já entra logada (sign-in no cliente reusando o login). Token forte só como hash no banco, uso único, 7d, índice único parcial por email pending; aceite server-authoritative (mantém `disableSignUp`); erros genéricos (sem enumeração); auditoria `invitation.create/accept/revoke`. Substitui o cadastro-com-senha (`user.create` removido) |
| 2026-08-29 | Hugo | — | 0,5 | Hardening pós-pentest: headers de segurança no nginx do web (`X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` anti-clickjacking, `nosniff`, `Referrer-Policy`, HSTS 1 ano). Pentest confirmou controle de acesso íntegro no servidor (IDOR/escalonamento barrados, redação de auditoria p/ TI, sem enumeração/stack trace, Gotenberg/Postgres não expostos) |
