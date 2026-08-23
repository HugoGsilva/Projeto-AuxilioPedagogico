/**
 * Applies Drizzle SQL migrations. Safe to run on every container start.
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({ path: "../../apps/server/.env" });

const { db } = await import("./index");

const migrationsFolder = join(import.meta.dir, "migrations");

await migrate(db, { migrationsFolder });
console.log("Migrations aplicadas:", migrationsFolder);
process.exit(0);
