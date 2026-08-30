/**
 * Seed universal das perguntas padrão do estudo de caso (idempotente).
 *
 * Roda em todo start da API (docker-entrypoint), independente de ALLOW_SEED.
 * Só popula com a tabela `question` vazia — nunca altera perguntas da escola.
 */
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });

const { db } = await import("./index");
const { seedDefaultQuestions } = await import("./default-questions");

seedDefaultQuestions(db)
  .then((result) => {
    console.log(
      result === "seeded"
        ? "Perguntas padrão do estudo de caso criadas."
        : "Tabela question já possui dados — nada a fazer.",
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
