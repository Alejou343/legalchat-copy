import { nanoid } from "@/lib/utils";
import {
  index,
  pgTable,
  text,
  varchar,
  vector,
  timestamp,
} from "drizzle-orm/pg-core";
import { resources } from "./resources";

/**
 * Drizzle ORM table schema definition for the "embeddings" table in PostgreSQL.
 *
 * Columns:
 * - id: string (primary key, generated with nanoid, max length 191)
 * - resource_id: string (foreign key referencing resources.id, cascade on delete, max length 191)
 * - user_email: string (max length 191)
 * - content: string (text, not nullable)
 * - embedding: number[] (vector type with 1024 dimensions, not nullable)
 * - createdAt: Date (timestamp with date mode, defaults to now, not nullable)
 * - updatedAt: Date (timestamp with date mode, defaults to now, not nullable)
 *
 * Indexes:
 * - embeddingIndex: HNSW index on the embedding vector using cosine similarity operations.
 */

export const embeddings = pgTable(
  "embeddings",
  {
    id: varchar("id", { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),

    resource_id: varchar("resource_id", { length: 191 }).references(
      () => resources.id,
      { onDelete: "cascade" }
    ),

    user_email: varchar("user_email", { length: 191 }),

    content: text("content").notNull(),

    embedding: vector("embedding", { dimensions: 1024 }).notNull(),

    createdAt: timestamp("created_at", {
      mode: "date",
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);
