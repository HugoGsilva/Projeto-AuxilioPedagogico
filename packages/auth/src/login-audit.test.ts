import { describe, expect, test } from "bun:test";

import { resolveLoginIp } from "./login-audit";

describe("resolveLoginIp", () => {
  test("prefers first x-forwarded-for hop", () => {
    const ip = resolveLoginIp(
      { id: "s1", userId: "u1", ipAddress: "9.9.9.9" },
      {
        request: {
          headers: {
            get: (name) =>
              name === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : null,
          },
        },
      },
    );
    expect(ip).toBe("1.2.3.4");
  });

  test("falls back to x-real-ip then session.ipAddress", () => {
    expect(
      resolveLoginIp(
        { id: "s1", userId: "u1", ipAddress: "9.9.9.9" },
        {
          request: {
            headers: {
              get: (name) => (name === "x-real-ip" ? "8.8.8.8" : null),
            },
          },
        },
      ),
    ).toBe("8.8.8.8");

    expect(
      resolveLoginIp({ id: "s1", userId: "u1", ipAddress: "9.9.9.9" }, null),
    ).toBe("9.9.9.9");
  });
});
