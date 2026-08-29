import { createHash, randomBytes } from "node:crypto";

/** Validade do link de convite (issue #67): 7 dias. */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Gera um token de convite: bytes aleatórios fortes (256 bits, URL-safe). O
 * `raw` só existe na URL do convite; o banco guarda apenas o `hash`.
 */
export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashInviteToken(raw) };
}

export function hashInviteToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Monta o link a partir da origem do app web (env.CORS_ORIGIN). */
export function buildInviteUrl(webOrigin: string, raw: string): string {
  const url = new URL("/convite", webOrigin);
  url.searchParams.set("token", raw);
  return url.toString();
}
