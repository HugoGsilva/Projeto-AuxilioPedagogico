# Escopo do MVP

Estratégia: **fatia vertical enxuta** — a primeira versão percorre o fluxo completo da seção 7 da [especificação](especificacao.md) em versão mínima, para que a escola use e valide o produto o quanto antes.

## Dentro do MVP

| # | Entrega | Observações |
| --- | --- | --- |
| 1 | Login + gestão de usuários | Better Auth, sem auto-cadastro; contas criadas por admin. 4 perfis fixos ([ADR-0002](adr/0002-permissoes-roles-fixas.md)). |
| 2 | Cadastro de alunos | Turma como campo descritivo; atribuição direta aluno↔professora. |
| 3 | Perguntas configuráveis (simples) | CRUD de perguntas com tipo, seção, ordem, obrigatoriedade, ativa/inativa. |
| 4 | Estudo de caso | Respostas às perguntas ativas + relatório livre. Snapshot do enunciado na resposta ([ADR-0003](adr/0003-snapshot-pergunta-na-resposta.md)). |
| 5 | Geração de PDF | Modelo padrão genérico via Gotenberg ([ADR-0005](adr/0005-pdf-gotenberg.md)); nome da escola configurável. |
| 6 | Auditoria de escritas | Tabela append-only: logins, CRUDs e geração de PDF ([ADR-0004](adr/0004-auditoria-append-only.md)). |
| 7 | Deploy | Docker Compose em VPS, HTTPS, backup diário ([ADR-0006](adr/0006-lgpd-baseline-e-deploy.md)). |

## Fora do MVP (fases futuras)

- Personalização avançada do PDF (cabeçalho/rodapé/template institucional) — MVP configura apenas nome da escola e dados básicos.
- Workflow de status do estudo de caso (rascunho → enviado → revisado → finalizado).
- Auditoria de **visualizações** de registros sensíveis.
- Permissões configuráveis via UI (flags por usuário).
- Turmas como entidade (hoje: campo descritivo do aluno).
- Múltiplas escolas (multi-tenancy) — o sistema é single-tenant por decisão.

## Premissas

- Produção real em **uma** escola; dados reais e sensíveis de crianças desde o primeiro uso.
- Equipe de desenvolvimento: 2–3 pessoas.
- Volume pequeno: dezenas de alunos acompanhados, dezenas de usuários.
