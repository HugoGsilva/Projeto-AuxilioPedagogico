/**
 * Perguntas padrão do estudo de caso — seed universal.
 *
 * As seções são numeradas porque a UI e o PDF ordenam `section` alfabeticamente.
 * As seções 1–4 espelham as quatro etapas do estudo de caso do Decreto
 * nº 12.686/2025 (art. 11, I–IV); a 5 registra a participação da família e do
 * aluno (§ 3º) e a 6 os encaminhamentos. Nenhuma pergunta obrigatória pode
 * exigir laudo/diagnóstico (§ 7º) — documentos de saúde entram só como
 * subsídio opcional.
 *
 * `seedDefaultQuestions` só insere com a tabela `question` vazia; o que a
 * escola configurar depois nunca é sobrescrito por seed.
 */
import { sql } from "drizzle-orm";

import type { createDb } from "./index";
import { question } from "./schema";

type Db = ReturnType<typeof createDb>;
type QuestionSeed = typeof question.$inferInsert;

const SECTION_1 = "1. Demandas e barreiras";
const SECTION_2 = "2. Contexto escolar";
const SECTION_3 = "3. Potencialidades e apoios";
const SECTION_4 = "4. Estratégias e recursos de acessibilidade";
const SECTION_5 = "5. Participação da família e do aluno";
const SECTION_6 = "6. Encaminhamentos e acompanhamento";

export const DEFAULT_QUESTIONS: QuestionSeed[] = [
  {
    prompt:
      "Quais são as principais demandas do aluno no contexto escolar (pedagógicas, de comunicação, de interação, de locomoção ou de cuidado)?",
    type: "long_text",
    section: SECTION_1,
    sortOrder: 1,
    required: true,
    active: true,
  },
  {
    prompt:
      "Quais barreiras à aprendizagem e à participação foram identificadas (pedagógicas, comunicacionais, atitudinais ou físicas)?",
    type: "long_text",
    section: SECTION_1,
    sortOrder: 2,
    required: true,
    active: true,
  },
  {
    prompt:
      "Desde quando essas demandas são percebidas e em quais situações aparecem com mais intensidade?",
    type: "long_text",
    section: SECTION_1,
    sortOrder: 3,
    required: false,
    active: true,
  },
  {
    prompt:
      "Como as barreiras identificadas se manifestam nas atividades em sala de aula e nos demais espaços da escola?",
    type: "long_text",
    section: SECTION_2,
    sortOrder: 1,
    required: true,
    active: true,
  },
  {
    prompt:
      "Quais aspectos do ambiente escolar favorecem a participação e a aprendizagem do aluno?",
    type: "long_text",
    section: SECTION_2,
    sortOrder: 2,
    required: false,
    active: true,
  },
  {
    prompt:
      "Como é a interação do aluno com colegas, professores e demais profissionais da escola?",
    type: "long_text",
    section: SECTION_2,
    sortOrder: 3,
    required: false,
    active: true,
  },
  {
    prompt: "Quais são as potencialidades, os interesses e as habilidades do aluno?",
    type: "long_text",
    section: SECTION_3,
    sortOrder: 1,
    required: true,
    active: true,
  },
  {
    prompt:
      "De quais apoios o aluno necessita no cotidiano escolar (recursos, profissionais de apoio, adaptações, tempo ampliado)?",
    type: "long_text",
    section: SECTION_3,
    sortOrder: 2,
    required: true,
    active: true,
  },
  {
    prompt: "O aluno frequenta o Atendimento Educacional Especializado (AEE)?",
    type: "select",
    section: SECTION_3,
    sortOrder: 3,
    required: false,
    active: true,
    options: ["Sim", "Não", "Em avaliação"],
  },
  {
    prompt:
      "Quais estratégias pedagógicas serão adotadas para eliminar ou reduzir as barreiras identificadas?",
    type: "long_text",
    section: SECTION_4,
    sortOrder: 1,
    required: true,
    active: true,
  },
  {
    prompt:
      "Quais recursos de acessibilidade serão utilizados (materiais adaptados, tecnologia assistiva, comunicação alternativa)?",
    type: "long_text",
    section: SECTION_4,
    sortOrder: 2,
    required: false,
    active: true,
  },
  {
    prompt: "Quais adaptações serão feitas nas atividades e nas avaliações?",
    type: "long_text",
    section: SECTION_4,
    sortOrder: 3,
    required: false,
    active: true,
  },
  {
    prompt: "A família participou desta etapa do estudo de caso?",
    type: "select",
    section: SECTION_5,
    sortOrder: 1,
    required: true,
    active: true,
    options: ["Sim", "Parcialmente", "Ainda não"],
  },
  {
    prompt:
      "Quem participou pela família e de que forma (reunião, conversa, questionário)?",
    type: "long_text",
    section: SECTION_5,
    sortOrder: 2,
    required: false,
    active: true,
  },
  {
    prompt:
      "Quais informações e estratégias que já deram certo foram trazidas pela família?",
    type: "long_text",
    section: SECTION_5,
    sortOrder: 3,
    required: false,
    active: true,
  },
  {
    prompt:
      "O aluno foi ouvido sobre suas preferências e necessidades? Registre como foi feita essa escuta.",
    type: "long_text",
    section: SECTION_5,
    sortOrder: 4,
    required: false,
    active: true,
  },
  {
    prompt:
      "Quais encaminhamentos foram definidos (AEE, rede de saúde, orientações à família, próximos passos)?",
    type: "long_text",
    section: SECTION_6,
    sortOrder: 1,
    required: true,
    active: true,
  },
  {
    prompt:
      "A família apresentou documentos de saúde como subsídio (ex.: avaliação biopsicossocial)? Registre quais, se houver — a oferta de apoio não depende de laudo.",
    type: "long_text",
    section: SECTION_6,
    sortOrder: 2,
    required: false,
    active: true,
  },
  {
    prompt: "Data prevista para a próxima revisão deste estudo de caso",
    type: "date",
    section: SECTION_6,
    sortOrder: 3,
    required: false,
    active: true,
  },
];

/**
 * Insere o conjunto padrão apenas se a tabela `question` estiver vazia.
 * Advisory lock evita corrida entre dois containers subindo ao mesmo tempo.
 */
export async function seedDefaultQuestions(db: Db): Promise<"seeded" | "skipped"> {
  let result: "seeded" | "skipped" = "skipped";
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(420001)`);
    const existing = await tx.select({ id: question.id }).from(question).limit(1);
    if (existing.length > 0) return;
    await tx.insert(question).values(DEFAULT_QUESTIONS);
    result = "seeded";
  });
  return result;
}
