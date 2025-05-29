import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "../db";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import logger from "../logger";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { MODEL_CONSTANTS } from "@/app/api/chat/constants/models";

/**
 * Splits the input text into chunks based on numbered headers like "1. Section Title".
 * Returns an array of non-empty trimmed chunks.
 * 
 * @param {string} input - The full text to be chunked.
 * @returns {string[]} An array of string chunks extracted from the input.
 */

export const generateChunks = (input: string): string[] => {
  // Divide por encabezados como "1. Background", "2. Migration Journey", etc.
  const rawSections = input.split(/(?=\d+\.\s[A-Z][^\n]+)/g);

  const chunks: string[] = [];

  for (let i = 0; i < rawSections.length; i++) {
    const section = rawSections[i].trim();
    if (section) {
      chunks.push(section);
    }
  }

  return chunks;
};

/**
 * Generates embeddings for multiple chunks of text.
 * It first splits the input into chunks, then generates embeddings for each chunk using the embedding model.
 * 
 * @param {string} value - The full text to embed.
 * @returns {Promise<Array<{ embedding: number[]; content: string }>>} 
 *   A promise that resolves to an array of objects containing each chunk's content and its embedding vector.
 */

export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);
  const { embeddings } = await embedMany({
    // model: openai.embedding(MODEL_CONSTANTS.OPENAI.EMBEDDING),
    model: bedrock.embedding(MODEL_CONSTANTS.ANTHROPIC.EMBEDDING),
    values: chunks,
  });
  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
};

/**
 * Generates an embedding vector for a single input string.
 * Replaces newline characters with spaces before generating the embedding.
 * 
 * @param {string} value - The string to embed.
 * @returns {Promise<number[]>} A promise that resolves to the embedding vector as an array of numbers.
 */

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    // model: openai.embedding(MODEL_CONSTANTS.OPENAI.EMBEDDING),
    model: bedrock.embedding(MODEL_CONSTANTS.ANTHROPIC.EMBEDDING),
    value: input,
  });
  return embedding;
};

/**
 * Finds relevant content chunks from embeddings that match a user's query.
 * It generates an embedding for the query, then performs a similarity search
 * against stored embeddings filtered by resource ID and a similarity threshold.
 * Returns the most similar chunks ordered by similarity.
 * 
 * @param {string} userQuery - The user's input query string.
 * @param {string} resource_id - The resource ID to filter embeddings.
 * @returns {Promise<Array<{ name: string; similarity: number }>>} 
 *   A promise that resolves to an array of objects with content and similarity score.
 */

export const findRelevantContent = async (
  userQuery: string,
  resource_id: string
) => {
  try {
    logger.info("⚠️ Buscando contenido relevante para la consulta del usuario");

    if (!userQuery || userQuery.trim() === "") {
      throw new Error("La consulta del usuario está vacía.");
    }

    // Generar embedding del input del usuario
    const userQueryEmbedded = await generateEmbedding(userQuery);

    // Crear expresión de similitud
    const similarityExpr = sql<number>`1 - (${cosineDistance(
      embeddings.embedding,
      userQueryEmbedded
    )})`;

    // Ejecutar consulta con ambas condiciones en el where
    const similarGuides = await db
      .select({
        name: embeddings.content,
        similarity: similarityExpr,
      })
      .from(embeddings)
      .where(
        and(eq(embeddings.resource_id, resource_id), gt(similarityExpr, 0.4))
      )
      .orderBy(() => desc(similarityExpr))
      .limit(4);

    if (similarGuides.length > 0) {
      logger.info(
        `✅ Contenido relevante encontrado: ${JSON.stringify(
          similarGuides.map((guide) => ({
            name: guide.name.slice(0, 20),
            similarity: guide.similarity,
          }))
        )}`
      );
    } else {
      logger.error("❌ No se encontró contenido relevante");
    }

    return similarGuides;
  } catch (error) {
    logger.error("❌ Error al buscar contenido relevante:", error);
    return []; // o podrías lanzar el error si quieres que lo maneje el caller
  }
};

/**
 * Retrieves the top N chunks associated with a specific resource ID without applying similarity filtering.
 * This returns the first N chunks stored for the resource.
 * 
 * @param {string} resource_id - The resource ID to query chunks for.
 * @param {number} [limit=4] - The maximum number of chunks to retrieve (default is 4).
 * @returns {Promise<Array<{ name: string }>>} A promise that resolves to an array of objects containing the chunk content.
 */

export const getTopChunksByResourceId = async (
  resource_id: string,
  limit = 4
): Promise<Array<{ name: string }>> => {
  try {
    const topChunks = await db
      .select({
        name: embeddings.content,
        similarity: sql<number>`1`,
      })
      .from(embeddings)
      .where(eq(embeddings.resource_id, resource_id))
      .limit(limit);

    if (topChunks.length === 0) {
      logger.warn(`⚠️ No se encontraron fragmentos para el recurso: ${resource_id}`);
    } else {
      logger.info(`✅ Se recuperaron los primeros ${limit} fragmentos del documento`);
    }

    return topChunks;
  } catch (error) {
    logger.error("❌ Error al obtener los primeros embeddings:", error);
    return [];
  }
};

