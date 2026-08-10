# ADR-0007 — Idioma: código em inglês, produto em português

- **Status:** aceita
- **Data:** 2026-08-10

## Contexto

O domínio é falado em português (aluno, estudo de caso, pedagoga), mas o código usa libs, keywords e convenções em inglês. Misturar idiomas em identificadores (`getAlunoById`) degrada a legibilidade.

## Decisão

- **Inglês:** identificadores, tabelas, colunas, rotas tRPC, nomes de arquivos de código.
- **Português:** UI, mensagens ao usuário, documentação (`docs/`), issues, PRs e mensagens de commit.
- O mapeamento oficial pt↔en fica no [glossário](../glossario.md) — termo novo no domínio entra primeiro lá.

## Consequências

- Código idiomático e acessível a qualquer dev; o glossário preserva a linguagem do domínio da escola.
- Disciplina necessária: revisar em PR o uso dos termos do glossário (sem sinônimos como `pupil`/`kid`).
