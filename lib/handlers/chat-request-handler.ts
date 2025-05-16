import {
  findRelevantContent,
  getTopChunksByResourceId,
} from "@/lib/ai/embedding";
import logger from "@/lib/logger";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "../prompts";
import { rewriteUserQuery } from "../utils/reformulate-query";

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
      model: openai("gpt-4o"),
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
