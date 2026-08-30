/**
 * Seed de usuários/alunos (fixtures de dev). As perguntas padrão do estudo de
 * caso vêm do seed universal (`default-questions.ts`), reusado aqui.
 *
 * Uso local: `bun run db:seed` (Postgres no ar + schema aplicado).
 * Na VPS: ALLOW_SEED=true e SEED_PASSWORD no stack (idempotente).
 *
 * Local sem SEED_PASSWORD: senha padrão `Dev@12345`.
 */
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";
import { inArray } from "drizzle-orm";

dotenv.config({ path: "../../apps/server/.env" });

const { db } = await import("./index");
const { seedDefaultQuestions } = await import("./default-questions");
const { account, user, student, studentAssignment, pdfSettings } = await import(
  "./schema"
);

function resolveSeedPassword(): string {
  const fromEnv = process.env.SEED_PASSWORD?.trim();
  if (fromEnv && fromEnv.length >= 8) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SEED_PASSWORD é obrigatório em produção (mínimo 8 caracteres).",
    );
  }
  return "Dev@12345";
}

const USERS = [
  {
    id: "seed_director",
    name: "Diretora Seed",
    email: "diretor@escola.local",
    role: "director" as const,
  },
  {
    id: "seed_it_admin",
    name: "TI Seed",
    email: "ti@escola.local",
    role: "it_admin" as const,
  },
  {
    id: "seed_pedagogue",
    name: "Pedagoga Seed",
    email: "pedagoga@escola.local",
    role: "pedagogue" as const,
  },
  {
    id: "seed_teacher",
    name: "Professora Seed",
    email: "professora@escola.local",
    role: "teacher" as const,
  },
] as const;

async function seed() {
  const allowSeed = process.env.ALLOW_SEED === "true";
  if (process.env.NODE_ENV === "production" && !allowSeed) {
    throw new Error(
      "db:seed recusado em produção. Defina ALLOW_SEED=true para o bootstrap da VPS.",
    );
  }

  const seedPassword = resolveSeedPassword();

  // Perguntas vêm do seed universal (default-questions), não deste seed de dev.
  if ((await seedDefaultQuestions(db)) === "seeded") {
    console.log("Perguntas padrão do estudo de caso criadas.");
  }

  const seedIds = USERS.map((u) => u.id);
  const existingSeedUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(inArray(user.id, [...seedIds]));

  if (existingSeedUsers.length === USERS.length) {
    console.log("Seed já aplicado (usuários seed_* existem). Nada a fazer.");
    return;
  }

  if (existingSeedUsers.length > 0) {
    const found = existingSeedUsers.map((u) => u.id).join(", ");
    throw new Error(
      `Seed parcial detectado (${found}). Limpe o banco (ou remova esses usuários) e rode db:seed de novo.`,
    );
  }

  const passwordHash = await hashPassword(seedPassword);

  await db.transaction(async (tx) => {
    for (const u of USERS) {
      await tx.insert(user).values({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        role: u.role,
      });
      await tx.insert(account).values({
        id: `seed_acc_${u.role}`,
        accountId: u.id,
        providerId: "credential",
        userId: u.id,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const [ana] = await tx
      .insert(student)
      .values({
        name: "Ana Clara Souza",
        className: "3º Ano A",
        birthDate: "2016-03-12",
        guardian: "Maria Souza",
        shift: "morning",
        notes: "Aluna de exemplo para desenvolvimento.",
      })
      .returning();

    const [bruno] = await tx
      .insert(student)
      .values({
        name: "Bruno Lima",
        className: "2º Ano B",
        birthDate: "2017-08-01",
        guardian: "José Lima",
        shift: "afternoon",
      })
      .returning();

    if (!ana || !bruno) {
      throw new Error("Falha ao criar alunos de seed");
    }

    await tx.insert(studentAssignment).values({
      studentId: ana.id,
      teacherId: "seed_teacher",
      assignedById: "seed_pedagogue",
    });

    await tx.insert(pdfSettings).values({
      schoolName: "Escola Municipal Seed",
      institutionalInfo: "Dados institucionais de exemplo (dev).",
      headerText: "Estudo de Caso — Necessidades Especiais",
      footerText: "Documento gerado pelo sistema de auxílio pedagógico",
      updatedById: "seed_director",
    });
  });

  console.log("Seed aplicado com sucesso.");
  console.log(`Usuários (senha: ${allowSeed ? "SEED_PASSWORD" : "Dev@12345"}):`);
  for (const u of USERS) {
    console.log(`  - ${u.role}: ${u.email}`);
  }
  console.log("Alunos: Ana Clara Souza (atribuída à professora), Bruno Lima.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
