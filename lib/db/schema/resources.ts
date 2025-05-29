import { sql } from "drizzle-orm";
import { text, varchar, timestamp, pgTable } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "@/lib/utils";

/**
 * Drizzle ORM table schema for the "resources" table.
 *
 * Columns:
 * - id: string (primary key, generated with nanoid, max length 191)
 * - user_email: string (max length 191)
 * - content: string (text, not nullable)
 * - createdAt: Date (timestamp, defaults to current time, not nullable)
 * - updatedAt: Date (timestamp, defaults to current time, not nullable)
 */

export const resources = pgTable("resources", {
  id: varchar("id", { length: 191 })
    .primaryKey()
    .$defaultFn(() => nanoid()),
  user_email: varchar("user_email", { length: 191 }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at")
    .notNull()
    .default(sql`now()`),
});

/**
 * Zod schema generated from the resources table definition.
 * Used for validating API request payloads when inserting new resources.
 * 
 * Omits id, createdAt, and updatedAt fields as these are auto-generated.
 */
export const insertResourceSchema = createSelectSchema(resources as any)
  .extend({})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });


/**
 * TypeScript type inferred from insertResourceSchema.
 * Represents the shape of data required to create a new resource.
 */
export type NewResourceParams = z.infer<typeof insertResourceSchema>;
