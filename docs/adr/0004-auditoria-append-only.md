# ADR-0004 — Auditoria: tabela append-only gravada pela aplicação

- **Status:** aceita
- **Data:** 2026-08-10

## Contexto

A spec (seção 5) trata auditoria como parte central do sistema: quem fez, o quê, quando, com valor anterior e novo.

## Decisão

Tabela `audit_log` **append-only**: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `before` (JSONB), `after` (JSONB), `created_at`, `ip`.

- Gravada **na mesma transação** de cada mutation, via middleware/helper único do tRPC — nenhuma mutation escreve sem auditar.
- Cobre: login, CRUD de usuários/alunos/perguntas/estudos de caso/respostas/relatório livre, alterações de configuração do PDF e geração de PDF.
- Sem `UPDATE`/`DELETE` na tabela (convenção + sem rotas de escrita; opcionalmente revogar permissões no Postgres).
- **Fora do MVP:** log de visualizações de registros sensíveis (spec deixa a critério da escola).

## Alternativas rejeitadas

- **Triggers no Postgres** — capturam tudo, mas perdem a semântica da ação (ex.: "gerou PDF") e exigem variáveis de sessão para identificar o usuário.
- **Híbrido app + triggers** — duas fontes de verdade para conciliar; excesso para a equipe atual.

## Consequências

- Semântica rica e fácil de exibir na UI de histórico.
- Acesso manual direto ao banco não é auditado — mitigar restringindo acesso ao Postgres (rede interna Docker, ADR-0006).
- O middleware é ponto único de falha de cobertura: revisar em PR toda mutation nova.
