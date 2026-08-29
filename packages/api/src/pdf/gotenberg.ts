/**
 * Cliente do Gotenberg (ADR-0005): converte HTML em PDF via container na
 * rede interna. Não conhece tRPC — lança Error com mensagem em português;
 * o chamador converte em TRPCError.
 */

const DEFAULT_TIMEOUT_MS = 20_000;

export async function convertHtmlToPdf(
  baseUrl: string,
  html: string,
  options?: { timeoutMs?: number },
): Promise<Uint8Array> {
  const form = new FormData();
  // O Gotenberg exige o documento raiz com o nome exato "index.html".
  form.append(
    "files",
    new File([html], "index.html", { type: "text/html" }),
  );

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/forms/chromium/convert/html`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch {
    throw new Error(
      "Serviço de geração de PDF indisponível ou demorou a responder. Tente novamente.",
    );
  }

  if (!response.ok) {
    throw new Error(
      `Falha na conversão do PDF (serviço respondeu ${response.status}).`,
    );
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  // Valida a assinatura %PDF — nunca entregar uma resposta de erro como .pdf.
  if (
    bytes.length < 4 ||
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46
  ) {
    throw new Error("O serviço de PDF retornou um documento inválido.");
  }

  return bytes;
}
