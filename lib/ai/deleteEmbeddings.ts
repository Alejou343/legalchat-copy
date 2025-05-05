import { eq } from 'drizzle-orm';
import logger from '../logger';
import { embeddings } from '../db/schema/embeddings';
import { db } from '../db';

export const deleteEmbeddingsByResourceId = async (resourceId: string) => {
  logger.info(`🗑️ Eliminando embeddings con resourceId = ${resourceId}`);

  const deletedCount = await db
    .delete(embeddings)
    .where(eq(embeddings.resourceId, resourceId));

  logger.info(`✅ ${deletedCount} embeddings eliminados`);
  return deletedCount;
};
