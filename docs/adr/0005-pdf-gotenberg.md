# ADR-0005 — Geração de PDF via Gotenberg

- **Status:** aceita
- **Data:** 2026-08-10

## Contexto

O sistema gera PDF do estudo de caso (spec 4.8), começando com modelo padrão e evoluindo para template institucional da escola (spec 4.3). O server roda em Bun, onde embutir Chromium (Puppeteer/Playwright) ainda tem arestas de compatibilidade.

## Decisão

Container **Gotenberg** (Chromium headless) no Docker Compose, ao lado do app. O server monta um template **HTML/CSS** do estudo de caso e envia ao Gotenberg para conversão em PDF.

## Alternativas rejeitadas

- **@react-pdf/renderer** — sem browser, mas usa subset próprio de CSS; reproduzir template institucional fiel dá mais trabalho.
- **Puppeteer no próprio server** — infla a imagem, mistura responsabilidades, arestas com Bun.

## Consequências

- Template é HTML/CSS comum: cabeçalho, rodapé, assinaturas e futura adaptação ao modelo da escola são edição de template.
- +1 container no VPS (RAM sob demanda); Gotenberg fica **apenas na rede interna** do Compose, sem porta pública.
- Toda geração de PDF é registrada no `audit_log` (ADR-0004).
