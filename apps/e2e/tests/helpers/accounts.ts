/** Contas seed do ambiente de homologação (packages/db/src/seed.ts). */

export type RoleKey = "director" | "it_admin" | "pedagogue" | "teacher";

export type SeedAccount = {
  role: RoleKey;
  email: string;
  /** Rótulo do papel exibido no rail (app-shell ROLE_LABELS). */
  roleLabel: string;
  /** Nome exibido no menu/rail. */
  name: string;
};

export const PASSWORD = process.env.E2E_PASSWORD ?? "Dev@12345";

export const ACCOUNTS: Record<RoleKey, SeedAccount> = {
  director: {
    role: "director",
    email: "diretor@escola.local",
    roleLabel: "Direção",
    name: "Diretora Seed",
  },
  it_admin: {
    role: "it_admin",
    email: "ti@escola.local",
    roleLabel: "TI",
    name: "TI Seed",
  },
  pedagogue: {
    role: "pedagogue",
    email: "pedagoga@escola.local",
    roleLabel: "Pedagoga",
    name: "Pedagoga Seed",
  },
  teacher: {
    role: "teacher",
    email: "professora@escola.local",
    roleLabel: "Professora",
    name: "Professora Seed",
  },
};

/** Alunos seed. Ana é atribuída à professora; Bruno não. */
export const SEED_STUDENTS = {
  assigned: "Ana Clara Souza",
  unassigned: "Bruno Lima",
} as const;

/** Itens de navegação esperados por papel (app-shell NAV_GROUPS × matriz ADR-0002). */
export const EXPECTED_NAV: Record<RoleKey, string[]> = {
  director: [
    "Painel",
    "Alunos",
    "Estudos de caso",
    "Atribuições",
    "Perguntas",
    "Usuários",
    "Configuração do PDF",
  ],
  it_admin: ["Painel", "Perguntas", "Usuários", "Configuração do PDF"],
  pedagogue: ["Painel", "Alunos", "Estudos de caso", "Atribuições", "Perguntas"],
  teacher: ["Painel", "Alunos", "Estudos de caso"],
};

/** Itens de navegação que NÃO devem aparecer para o papel. */
export const FORBIDDEN_NAV: Record<RoleKey, string[]> = {
  director: [],
  it_admin: ["Alunos", "Estudos de caso", "Atribuições"],
  pedagogue: ["Usuários", "Configuração do PDF"],
  teacher: ["Atribuições", "Perguntas", "Usuários", "Configuração do PDF"],
};
