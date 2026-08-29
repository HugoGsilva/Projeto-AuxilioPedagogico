import { describe, expect, test } from "bun:test";

import {
  buildInviteUrl,
  generateInviteToken,
  hashInviteToken,
  INVITE_TTL_MS,
} from "./invitation-token";

describe("token de convite", () => {
  test("gera token forte, URL-safe, e o hash bate", () => {
    const { raw, hash } = generateInviteToken();
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
    expect(raw.length).toBeGreaterThanOrEqual(40); // 256 bits
    expect(hash).toBe(hashInviteToken(raw));
    expect(hash).toHaveLength(64); // sha256 hex
  });

  test("tokens distintos a cada geração", () => {
    expect(generateInviteToken().raw).not.toBe(generateInviteToken().raw);
  });

  test("hash é determinístico e o raw não é derivável (é só de mão única)", () => {
    expect(hashInviteToken("abc")).toBe(hashInviteToken("abc"));
    expect(hashInviteToken("abc")).not.toBe(hashInviteToken("abd"));
  });

  test("monta a URL na origem do web com o token no query", () => {
    const url = buildInviteUrl("https://extensao.hugogsilva.dev", "tok-123");
    expect(url).toBe("https://extensao.hugogsilva.dev/convite?token=tok-123");
  });

  test("TTL de 7 dias", () => {
    expect(INVITE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
