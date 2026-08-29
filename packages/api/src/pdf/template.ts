import type { QuestionSnapshot } from "@auxilio-pedagogico/db/schema/domain";
import { shiftEnum } from "@auxilio-pedagogico/db/schema/enums";

/**
 * Template HTML do PDF do estudo de caso (ADR-0005). Função TS (não .html):
 * sobrevive ao bundle do tsdown e força escape por construção — todo texto
 * vindo de usuário passa por escapeHtml antes de entrar no documento.
 */

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Texto livre multiline → HTML escapado com quebras preservadas. */
function escapeMultiline(input: string): string {
  return escapeHtml(input).replaceAll("\n", "<br>");
}

/* Amarrado ao enum do banco: valor novo de shift quebra o typecheck aqui. */
const SHIFT_LABELS = {
  morning: "Manhã",
  afternoon: "Tarde",
  full_day: "Integral",
} satisfies Record<(typeof shiftEnum.enumValues)[number], string>;

/**
 * "2020-03-01" → "01/03/2020". Fatia a string — new Date() deslocaria o fuso.
 * Retorna SEMPRE texto cru (sem escape): os call sites escapam.
 */
export function formatIsoDatePtBr(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

export function formatDateTimePtBr(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/** Valor de resposta formatado pelo TIPO DO SNAPSHOT (ADR-0003), já escapado. */
export function formatAnswerValue(
  snapshot: Pick<QuestionSnapshot, "type">,
  value: string | null,
): string {
  if (value == null || value.trim().length === 0) return "—";
  if (snapshot.type === "date") return escapeHtml(formatIsoDatePtBr(value));
  if (snapshot.type === "number") return escapeHtml(value.replace(".", ","));
  if (snapshot.type === "long_text") return escapeMultiline(value);
  return escapeHtml(value);
}

export type CaseStudyPdfData = {
  settings: {
    schoolName: string;
    institutionalInfo: string | null;
    headerText: string | null;
    footerText: string | null;
  } | null;
  student: {
    name: string;
    className: string | null;
    birthDate: string | null;
    guardian: string | null;
    shift: string | null;
  };
  /** Responsável pelo preenchimento (criador do estudo). */
  createdByName: string | null;
  /** Quem gerou o documento. */
  generatedByName: string;
  generatedAt: Date;
  answers: Array<{ questionSnapshot: QuestionSnapshot; value: string | null }>;
  freeReport: string | null;
};

function groupBySection(
  answers: CaseStudyPdfData["answers"],
): Array<{ section: string; items: CaseStudyPdfData["answers"] }> {
  const map = new Map<string, CaseStudyPdfData["answers"]>();
  for (const answer of answers) {
    const key = answer.questionSnapshot.section?.trim() || "Geral";
    const list = map.get(key) ?? [];
    list.push(answer);
    map.set(key, list);
  }
  return [...map.entries()].map(([section, items]) => ({ section, items }));
}

function infoRow(label: string, value: string | null): string {
  return `<div class="info-row"><span class="info-label">${escapeHtml(label)}</span><span>${
    value == null || value.trim().length === 0 ? "—" : escapeHtml(value)
  }</span></div>`;
}

export function renderCaseStudyHtml(data: CaseStudyPdfData): string {
  const schoolName = data.settings?.schoolName?.trim() || "Escola";
  const sections = groupBySection(data.answers);

  const answersHtml =
    sections.length === 0
      ? `<p class="empty">Nenhuma pergunta respondida.</p>`
      : sections
          .map(
            (group) => `
      <section class="qa-section">
        <h2>${escapeHtml(group.section)}</h2>
        ${group.items
          .map(
            (item) => `
        <div class="qa-item">
          <p class="question">${escapeHtml(item.questionSnapshot.prompt)}</p>
          <p class="answer">${formatAnswerValue(item.questionSnapshot, item.value)}</p>
        </div>`,
          )
          .join("")}
      </section>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Estudo de caso — ${escapeHtml(data.student.name)}</title>
<style>
  @page { size: A4; margin: 2cm 1.8cm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; font-size: 12pt; line-height: 1.5; margin: 0; }
  header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; }
  header h1 { font-size: 16pt; margin: 0 0 4px; }
  header .institutional { font-size: 10pt; color: #444; white-space: pre-wrap; }
  header .header-text { font-size: 10pt; color: #444; margin-top: 4px; }
  .doc-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 0 0 20px; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-block { border: 1px solid #999; padding: 12px 16px; margin-bottom: 20px; }
  .info-row { display: flex; gap: 8px; padding: 2px 0; }
  .info-label { font-weight: bold; min-width: 170px; }
  h2 { font-size: 12pt; border-bottom: 1px solid #999; padding-bottom: 4px; margin: 20px 0 10px; }
  .qa-item { margin-bottom: 10px; page-break-inside: avoid; }
  .question { font-weight: bold; margin: 0 0 2px; }
  .answer { margin: 0 0 0 12px; white-space: pre-wrap; }
  .free-report { white-space: pre-wrap; margin: 0; }
  .empty { color: #666; font-style: italic; }
  .meta { margin-top: 24px; font-size: 10pt; color: #444; }
  .signatures { display: flex; gap: 40px; margin-top: 48px; page-break-inside: avoid; }
  .signature { flex: 1; text-align: center; font-size: 10pt; }
  .signature .line { border-top: 1px solid #1a1a1a; margin-top: 40px; padding-top: 4px; }
  footer { margin-top: 32px; text-align: center; font-size: 9pt; color: #666; border-top: 1px solid #ccc; padding-top: 8px; }
</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(schoolName)}</h1>
    ${data.settings?.institutionalInfo ? `<p class="institutional">${escapeMultiline(data.settings.institutionalInfo)}</p>` : ""}
    ${data.settings?.headerText ? `<p class="header-text">${escapeHtml(data.settings.headerText)}</p>` : ""}
  </header>

  <p class="doc-title">Estudo de caso</p>

  <div class="info-block">
    ${infoRow("Aluno(a)", data.student.name)}
    ${infoRow("Turma", data.student.className)}
    ${infoRow("Turno", data.student.shift ? ((SHIFT_LABELS as Record<string, string>)[data.student.shift] ?? data.student.shift) : null)}
    ${infoRow("Data de nascimento", data.student.birthDate ? formatIsoDatePtBr(data.student.birthDate) : null)}
    ${infoRow("Responsável", data.student.guardian)}
  </div>

  ${answersHtml}

  <section class="qa-section">
    <h2>Relatório livre da professora</h2>
    ${
      data.freeReport?.trim()
        ? `<p class="free-report">${escapeMultiline(data.freeReport)}</p>`
        : `<p class="empty">Não preenchido.</p>`
    }
  </section>

  <div class="meta">
    <p>Preenchido por: ${escapeHtml(data.createdByName ?? "—")}</p>
    <p>Documento gerado por ${escapeHtml(data.generatedByName)} em ${escapeHtml(formatDateTimePtBr(data.generatedAt))}.</p>
  </div>

  <div class="signatures">
    <div class="signature"><div class="line">Professora</div></div>
    <div class="signature"><div class="line">Pedagoga / Direção</div></div>
    <div class="signature"><div class="line">Responsável</div></div>
  </div>

  ${data.settings?.footerText ? `<footer>${escapeHtml(data.settings.footerText)}</footer>` : ""}
</body>
</html>`;
}
