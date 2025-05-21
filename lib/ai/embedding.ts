import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "../db";
import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import logger from "../logger";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { MODEL_CONSTANTS } from "@/app/api/chat/constants/models";

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

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding } = await embed({
    // model: openai.embedding(MODEL_CONSTANTS.OPENAI.EMBEDDING),
    model: bedrock.embedding(MODEL_CONSTANTS.ANTHROPIC.EMBEDDING),
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

