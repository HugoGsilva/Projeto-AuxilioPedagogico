import { afterEach, describe, expect, test } from "bun:test";

import { convertHtmlToPdf } from "./gotenberg";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(handler: (url: string, init: RequestInit) => Response) {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) =>
    handler(String(url), init ?? {})) as typeof fetch;
}

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

describe("convertHtmlToPdf", () => {
  test("envia multipart com index.html e retorna os bytes do PDF", async () => {
    let seenUrl = "";
    let seenFileName: string | undefined;
    mockFetch((url, init) => {
      seenUrl = url;
      const form = init.body as FormData;
      const file = form.get("files");
      seenFileName = file instanceof File ? file.name : undefined;
      return new Response(PDF_BYTES, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      });
    });

    const bytes = await convertHtmlToPdf("http://gotenberg:3000", "<html></html>");
    expect(seenUrl).toBe("http://gotenberg:3000/forms/chromium/convert/html");
    expect(seenFileName).toBe("index.html");
    expect(bytes[0]).toBe(0x25);
  });

  test("status não-2xx vira erro em português", async () => {
    mockFetch(() => new Response("boom", { status: 500 }));
    await expect(
      convertHtmlToPdf("http://gotenberg:3000", "<html></html>"),
    ).rejects.toThrow(/Falha na conversão do PDF/);
  });

  test("resposta sem assinatura %PDF é rejeitada", async () => {
    mockFetch(
      () =>
        new Response("<html>erro do proxy</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );
    await expect(
      convertHtmlToPdf("http://gotenberg:3000", "<html></html>"),
    ).rejects.toThrow(/documento inválido/);
  });

  test("falha de rede vira mensagem de indisponibilidade", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    await expect(
      convertHtmlToPdf("http://gotenberg:3000", "<html></html>"),
    ).rejects.toThrow(/indisponível/);
  });
});
