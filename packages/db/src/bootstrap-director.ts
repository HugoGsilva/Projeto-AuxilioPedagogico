/**
 * Bootstrap da conta "mãe" de diretora a partir de variáveis de ambiente.
 *
 * Roda em todo start da API (docker-entrypoint). Sem BOOTSTRAP_DIRECTOR_EMAIL
 * e BOOTSTRAP_DIRECTOR_PASSWORD, não faz nada. Idempotente por e-mail: nunca
 * altera senha, papel ou nome de conta existente — trocas posteriores são
 * feitas pela UI (e a senha nunca aparece em log ou auditoria).
 *
 * Mesmo caminho de criação do aceite de convite (ADR-0008): INSERT em `user`
 * + `account` (provider credential) com o hash scrypt do Better Auth.
 */
import { hashPassword } from "better-auth/crypto";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config({ path: "../../apps/server/.env" });

const { db } = await import("./index");
const { account, auditLog, user } = await import("./schema");

async function bootstrapDirector() {
  const email = process.env.BOOTSTRAP_DIRECTOR_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_DIRECTOR_PASSWORD?.trim();
  const name = process.env.BOOTSTRAP_DIRECTOR_NAME?.trim() || "Diretora";

  if (!email && !password) {
    console.log("BOOTSTRAP_DIRECTOR_* ausentes — bootstrap da diretora ignorado.");
    return;
  }
  if (!email || !password) {
    throw new Error(
      "BOOTSTRAP_DIRECTOR_EMAIL e BOOTSTRAP_DIRECTOR_PASSWORD devem ser definidos juntos.",
    );
  }
  if (/TROCAR/i.test(email) || /TROCAR/i.test(password)) {
    throw new Error(
      "BOOTSTRAP_DIRECTOR_* com placeholder TROCAR_* pendente — preencha valores reais.",
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error("BOOTSTRAP_DIRECTOR_EMAIL inválido.");
  }
  if (password.length < 8) {
    throw new Error(
      "BOOTSTRAP_DIRECTOR_PASSWORD muito curta (mínimo 8 caracteres; use uma senha forte).",
    );
  }

  const [existing] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);

  if (existing) {
    if (existing.role !== "director") {
      console.warn(
        `AVISO: ${email} já existe com papel "${existing.role}" — nada foi alterado.`,
      );
    } else {
      console.log(`Diretora ${email} já existe — nada a fazer (senha não é alterada por env).`);
    }
    return;
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "director",
    });
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await tx.insert(auditLog).values({
      userId,
      action: "user.create",
      entityType: "user",
      entityId: userId,
      after: { name, email, role: "director", source: "bootstrap_env" },
    });
  });

  console.log(`Conta de diretora criada: ${email}`);
}

bootstrapDirector()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
