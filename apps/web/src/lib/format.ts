/** Formata data/hora no padrão pt-BR exibido nas listagens. */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR");
}
