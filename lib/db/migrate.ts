/**
 * Script to run database migrations using Drizzle ORM's migrator for PostgreSQL.
 *
 * It:
 * - Validates the presence of DATABASE_URL environment variable.
 * - Connects to the PostgreSQL database.
 * - Executes migrations found in the specified migrations folder.
 * - Logs the migration start and completion with elapsed time.
 * - Exits the process with code 0 on success, or 1 on failure.
 */

import { env } from "@/lib/env.mjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import logger from "../logger";

const runMigrate = async () => {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const connection = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  logger.warn("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  const end = Date.now();

  logger.info("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  logger.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});