/** Rótulos PT das actions/entidades do audit_log (glossário do domínio). */

export const ACTION_LABELS: Record<string, string> = {
  login: "Login no sistema",
  "user.create": "Cadastro de usuário",
  "user.update": "Edição de usuário",
  "user.activate": "Reativação de usuário",
  "user.deactivate": "Desativação de usuário",
  "student.create": "Cadastro de aluno",
  "student.update": "Edição de aluno",
  "student.activate": "Reativação de aluno",
  "student.deactivate": "Desativação de aluno",
  "studentAssignment.create": "Atribuição de aluno",
  "studentAssignment.remove": "Remoção de atribuição",
  "question.create": "Criação de pergunta",
  "question.update": "Edição de pergunta",
  "question.activate": "Ativação de pergunta",
  "question.deactivate": "Desativação de pergunta",
  "question.reorder": "Reordenação de perguntas",
  "caseStudy.create": "Criação de estudo de caso",
  "answer.upsert": "Alteração de respostas",
  "freeReport.update": "Alteração do relatório livre",
  "pdfSettings.update": "Alteração da configuração do PDF",
  "pdfGeneration.create": "Geração de PDF",
  "invitation.create": "Convite enviado",
  "invitation.accept": "Convite aceito",
  "invitation.revoke": "Convite cancelado",
};

export const ENTITY_LABELS: Record<string, string> = {
  user: "Usuário",
  student: "Aluno",
  studentAssignment: "Atribuição",
  question: "Pergunta",
  caseStudy: "Estudo de caso",
  answer: "Resposta",
  freeReport: "Relatório livre",
  pdfSettings: "Configuração do PDF",
  pdfGeneration: "Geração de PDF",
  session: "Sessão",
  invitation: "Convite",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}
