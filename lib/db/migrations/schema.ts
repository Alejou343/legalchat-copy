import { pgTable, varchar, text, timestamp, index, vector } from "drizzle-orm/pg-core"

export const resources = pgTable("resources", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	content: text("content").notNull(),
	user_email: varchar("user_email", { length: 191 }),
	created_at: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
});

export const embeddings = pgTable("embeddings", {
	id: varchar("id", { length: 191 }).primaryKey().notNull(),
	resource_id: varchar("resource_id", { length: 191 }).references(() => resources.id, { onDelete: "cascade" } ),
	content: text("content").notNull(),
	embedding: vector("embedding", { dimensions: 1024 }).notNull(),
	user_email: varchar("user_email", { length: 191 }),
	created_at: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { mode: 'date' }).defaultNow().notNull(),
},
(table) => {
	return {
		embeddingIndex: index("embeddingIndex").using("hnsw", table.embedding.op("vector_cosine_ops")),
	}
});