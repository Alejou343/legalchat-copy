import {
  findRelevantContent,
  getTopChunksByResourceId,
} from "@/lib/ai/embedding";
import logger from "@/lib/logger";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "../prompts";
import { rewriteUserQuery } from "../utils/reformulate-query";
import { MODEL_CONSTANTS } from "@/app/api/chat/constants/models";
import { bedrock } from "@ai-sdk/amazon-bedrock";

/**
 * Handles a chat request by processing user messages, fetching relevant content,
 * and streaming the AI-generated response.
 *
 * @param {Array<{content: string}>} messages - Array of chat message objects from the user and assistant.
 * @param {string} resource_id - The resource identifier to find relevant content embeddings.
 * @returns {Promise<Response | any>} - Returns a streaming response with the AI answer or a JSON error response.
 *
 * Process steps:
 * 1. Extracts the last user message from the chat history.
 * 2. Reformulates the user query for better embedding search.
 * 3. Retrieves relevant content chunks related to the query and resource.
 * 4. Retrieves top summary chunks by resource.
 * 5. Combines and deduplicates relevant and summary chunks.
 * 6. Builds a system prompt with combined chunks and user message.
 * 7. Streams the AI model's response based on the prompt and messages.
 * 8. Handles errors by logging and returning a JSON error response.
 */

export async function handleChatRequest(messages: any, resource_id: string) {
  try {
    logger.warn("⚠️ Procesando solicitud de chat");

    logger.info("✅ Mensajes obtenidos del cuerpo de la solicitud");

    const lastUserMessage = messages[messages.length - 1].content;
    const reformulateQuery = await rewriteUserQuery(lastUserMessage);

    logger.info(`✅ Query reformulada correctamente ${reformulateQuery}`);
    const relevantContent = await findRelevantContent(
      reformulateQuery,
      resource_id
    );
    logger.info(
      `✅ Contenido relevante encontrado: ${relevantContent.length} fragmentos`
    );

    const summaryChunks = await getTopChunksByResourceId(resource_id, 3);

    const seen = new Set();
    const combinedChunks = [...summaryChunks, ...relevantContent].filter(
      (chunk) => {
        if (seen.has(chunk.name)) return false;
        seen.add(chunk.name);
        return true;
      }
    );

    const prompt = buildSystemPrompt(combinedChunks, lastUserMessage);

    const result = streamText({
      // model: openai(MODEL_CONSTANTS.OPENAI.DEFAULT),
      model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
      system: prompt,
      temperature: 0.4,
      maxSteps: 5,
      messages,
    });

    logger.info("✅ Solicitud de chat procesada correctamente");
    return result.toDataStreamResponse();
  } catch (error) {
    logger.error("❌ Error en el flujo de chat", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud de chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
