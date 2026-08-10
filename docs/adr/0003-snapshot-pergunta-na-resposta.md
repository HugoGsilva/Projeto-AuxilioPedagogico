# ADR-0003 — Perguntas editáveis: snapshot do enunciado na resposta

- **Status:** aceita
- **Data:** 2026-08-10

## Contexto

As perguntas do estudo de caso são configuráveis e editáveis pela escola (spec 4.4). Se uma pergunta for editada depois de já ter sido respondida em estudos de caso, o significado histórico dos documentos não pode ser corrompido — o PDF de um estudo de caso antigo precisa mostrar o texto que foi de fato respondido.

## Decisão

Ao salvar uma resposta, gravar junto um **snapshot** da pergunta no momento do preenchimento: enunciado, tipo e opções (JSONB na tabela `answer`, além da FK para `question`).

Perguntas podem ser editadas livremente; a exibição e o PDF de estudos de caso existentes usam sempre o snapshot.

## Alternativas rejeitadas

- **Versionamento completo de perguntas** — mais normalizado, porém maquinaria excessiva para o MVP.
- **Edição restrita (só typo)** — burocrático e impossível de fiscalizar.

## Consequências

- Documentos antigos são imutáveis em significado, sem tabelas de versão.
- Leve denormalização: o snapshot repete dados da pergunta em cada resposta (volume irrisório).
- Relatórios comparativos entre "versões" de uma pergunta não são triviais — aceitável; se virar necessidade, migrar para versionamento em nova ADR.
