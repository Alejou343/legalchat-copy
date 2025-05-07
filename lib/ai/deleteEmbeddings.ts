import { eq } from "drizzle-orm";
import logger from "../logger";
import { embeddings } from "../db/schema/embeddings";
import { db } from "../db";

export const deleteEmbeddingsByResourceId = async (resource_id: string) => {
  logger.info(`🗑️ Eliminando embeddings con resource_id = ${resource_id}`);

  const deletedCount = await db
    .delete(embeddings)
    .where(eq(embeddings.resource_id, resource_id));

  logger.info(`✅ ${deletedCount} embeddings eliminados`);
  return deletedCount;
};
