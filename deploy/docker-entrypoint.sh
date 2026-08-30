#!/bin/sh
set -eu

cd /app

echo "[api] aguardando Postgres e aplicando migrations…"
i=0
until bun packages/db/src/migrate.ts; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "[api] Postgres indisponível após várias tentativas."
    exit 1
  fi
  sleep 2
done

echo "[api] perguntas padrão do estudo de caso (idempotente; só com a tabela vazia)"
bun packages/db/src/seed-questions.ts

if [ "${ALLOW_SEED:-false}" = "true" ]; then
  echo "[api] ALLOW_SEED=true — seed idempotente"
  bun packages/db/src/seed.ts
fi

# Resolver pacotes a partir da raiz do monorepo (Bun workspace).
exec bun apps/server/dist/index.mjs
