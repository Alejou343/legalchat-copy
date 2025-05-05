import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '../db';
import { cosineDistance, desc, gt, sql } from 'drizzle-orm';
import { embeddings } from '../db/schema/embeddings';
import logger from '../logger';

const embeddingModel = openai.embedding("text-embedding-3-small");

export const generateChunks = (
  input: string,
  maxLength: number = 100,
  overlap: number = 20
): string[] => {
  const chunks: string[] = [];

  let position = 0;

  while (position < input.length) {
    const end = Math.min(position + maxLength, input.length);
    const chunk = input.slice(position, end).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Mueve la posición con solapamiento
    position += maxLength - overlap;
  }

  return chunks;
};

export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
    logger.info("⚠️ Buscando contenido relevante para la consulta del usuario");
    const userQueryEmbedded = await generateEmbedding(userQuery);
    const similarity = sql<number>`1 - (${cosineDistance(
        embeddings.embedding,
        userQueryEmbedded,
    )})`;
    const similarGuides = await db
    .select({ name: embeddings.content, similarity })
    .from(embeddings)
    .where(gt(similarity, 0.5))
    .orderBy(t => desc(t.similarity))
    .limit(4);
    logger.info("✅ Contenido relevante encontrado");
  return similarGuides;
};