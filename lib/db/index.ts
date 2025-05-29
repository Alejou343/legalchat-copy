/**
 * Initializes and exports the Drizzle ORM database instance connected to PostgreSQL.
 *
 * Uses the "postgres" client library with connection URL from environment variables.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env.mjs";

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client);