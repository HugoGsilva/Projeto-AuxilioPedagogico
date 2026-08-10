# ADR-0002 — Permissões: 4 roles fixas com policy centralizada

- **Status:** aceita
- **Data:** 2026-08-10

## Contexto

A spec (seção 4.2) traz tabelas de permissões com vários itens "a definir" e "se autorizado". Sistema single-tenant, volume pequeno, dados sensíveis de crianças.

## Decisão

Quatro roles **fixas no código** — `director`, `it_admin`, `pedagogue`, `teacher` — com a matriz de permissões centralizada em um único módulo de policy, coberto por testes. Sem permissões configuráveis via UI no MVP.

Autenticação com **Better Auth**: e-mail/senha, sessões persistidas no banco (revogáveis e auditáveis), **sem auto-cadastro** — contas criadas por administradores.

Os pontos em aberto da spec foram resolvidos com defaults conservadores:

| Ponto em aberto | Default adotado |
| --- | --- |
| TI visualiza estudos de caso? | **Não.** TI não acessa dados de alunos. |
| TI consulta auditoria? | Sim, exceto conteúdo de dados de alunos (valores antes/depois). |
| Professora gera PDF? | **Não** no MVP; direção e pedagoga geram. |
| Pedagoga configura perguntas? | **Sim.** |
| Professora vê quais alunos? | Apenas alunos com atribuição direta (`studentAssignment`). |
| Auditoria da professora | Vê apenas as próprias ações. |

## Consequências

- Regras explícitas, testáveis e auditáveis em um só lugar; sem UI de permissões para construir.
- Vínculo professora↔aluno por **atribuição direta** (tabela `studentAssignment` mantida por admin/pedagoga); turma é campo descritivo do aluno, não entidade de permissão.
- Se a escola precisar de exceções por usuário no futuro, evoluir para roles + flags pontuais em nova ADR.
