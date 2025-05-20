import { nanoid } from "@/lib/utils";
import { index, pgTable, text, varchar, vector } from "drizzle-orm/pg-core";
import { resources } from "./resources";

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
    userEmail: varchar("user_email", { length: 191 }),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  },
  (table) => ({
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  })
);
