/**
 * Mock local do Gotenberg para dev/e2e sem Docker: responde ao endpoint de
 * conversão com um PDF mínimo válido. Permite exercitar o caminho completo
 * auth → policy → template → conversão → auditoria → download.
 *
 * Uso: `bun run apps/e2e/tools/gotenberg-mock.ts` (porta 3010) e suba a API
 * com `GOTENBERG_URL=http://localhost:3010`.
 */

const PORT = Number(process.env.GOTENBERG_MOCK_PORT ?? 3010);

const MINIMAL_PDF = [
  "%PDF-1.4",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj",
  "trailer<</Root 1 0 R>>",
  "%%EOF",
].join("\n");

Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    if (
      request.method === "POST" &&
      url.pathname === "/forms/chromium/convert/html"
    ) {
      // Confirma que o multipart veio com o index.html antes de responder.
      const form = await request.formData();
      const file = form.get("files");
      if (!(file instanceof File) || file.name !== "index.html") {
        return new Response("faltou o index.html", { status: 400 });
      }
      return new Response(MINIMAL_PDF, {
        headers: { "Content-Type": "application/pdf" },
      });
    }
    return new Response("gotenberg-mock", { status: 404 });
  },
});

console.log(`gotenberg-mock ouvindo em http://localhost:${PORT}`);
