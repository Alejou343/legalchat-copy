import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "../db";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import logger from "../logger";

const embeddingModel = openai.embedding("text-embedding-3-small");

export const generateChunks = (
  input: string,
  maxLength: number = 1000,
  overlap: number = 100
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
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    model: embeddingModel,
    value: input,
  });
  return embedding;
};

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
        and(
          gt(similarityExpr, 0.4)
          // eq(embeddings.resource_id, resource_id)
        )
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
