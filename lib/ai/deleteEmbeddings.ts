import { eq } from "drizzle-orm";
import logger from "../logger";
import { embeddings } from "../db/schema/embeddings";
import { db } from "../db";

/**
 * Deletes embeddings associated with a given resource ID.
 *
 * @param {string} resource_id - The ID of the resource whose embeddings should be deleted.
 *
 * @returns {Promise<number>} The number of embeddings deleted.
 *
 * @example
 * const deleted = await deleteEmbeddingsByResourceId("resource-id-123");
 * console.log(`Deleted ${deleted} embeddings.`);
 */

export const deleteEmbeddingsByResourceId = async (resource_id: string) => {
  logger.info(`🗑️ Eliminando embeddings con resource_id = ${resource_id}`);

  const deletedCount = await db
    .delete(embeddings)
    .where(eq(embeddings.resource_id, resource_id));

  logger.info(`✅ ${deletedCount} embeddings eliminados`);
  return deletedCount;
};
