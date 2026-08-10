# ADR-0006 — LGPD baseline e deploy em VPS com Docker

- **Status:** aceita
- **Data:** 2026-08-10

## Contexto

O sistema trata dados sensíveis de crianças (LGPD, dados de saúde/educação) em produção real. Single-tenant, escala pequena, equipe de 2–3.

## Decisão

**Deploy:** VPS/cloud (preferência por região São Paulo ou provedor nacional) com **Docker Compose**: proxy TLS + web (estático) + server (Bun/Hono) + PostgreSQL + Gotenberg.

**Baseline de proteção:**

1. HTTPS obrigatório — proxy reverso (Caddy ou Traefik) com Let's Encrypt;
2. Hashing forte de senha (padrão do Better Auth) e sessões revogáveis em banco;
3. PostgreSQL e Gotenberg **sem porta pública** — apenas rede interna do Compose;
4. Backup diário automatizado do banco (`pg_dump`), **criptografado** e enviado para fora do VPS (object storage);
5. Segredos somente em variáveis de ambiente / `.env` fora do git (`.env.example` versionado com placeholders);
6. Restore de backup testado periodicamente.

**Fora do baseline (reavaliar depois):** criptografia campo-a-campo — a chave moraria no mesmo servidor, ganho real limitado; complica busca e manutenção.

## Consequências

- Perda do VPS não implica perda de dados (backup off-site) nem vazamento em texto claro (backup criptografado).
- Custo fixo e previsível; operação exige disciplina da equipe (atualizações do host, monitorar backups).
