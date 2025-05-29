import logger from "@/lib/logger";
// import { handlePdfUpload } from "@/lib/handlers/pdf-upload-handler";
// import { handleRagChatRequest } from "@/lib/handlers/rag-chat-handler";
// import { handleWorkflowChatRequest } from "@/lib/handlers/workflow-chat-handler";
// import { handleDefaultChatRequest } from "@/lib/handlers/default-chat-handler";
import type { NextRequest } from "next/server";
import { handleChatRequest } from "@/lib/handlers/chat-request-handler";

/**
 * Handles POST requests for chat interactions supporting different chat modes.
 *
 * - Parses the request body expecting JSON with fields: `messages`, `resource_id`, and optional `chatMode`.
 * - Supports chat modes: "rag", "workflow", and "default".
 * - Logs the selected chat mode and routes to the appropriate handler.
 * - Currently uses a temporary common handler `handleChatRequest` for all modes.
 * - Handles multipart/form-data content type for file uploads (currently commented out).
 *
 * @param {NextRequest} req - Incoming Next.js request object.
 *
 * @returns {Promise<Response>} The response from the chat handler or an error response for invalid JSON.
 *
 * @throws {Response} Returns 400 status if the JSON parsing fails.
 *
 * @example
 * // POST /api/chat
 * // Request body:
 * // {
 * //   "messages": [...],
 * //   "resource_id": "123",
 * //   "chatMode": "workflow"
 * // }
 * // Response: Depends on handler implementation.
 */

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  logger.warn("⚠️ Procesando solicitud POST");

  if (contentType.includes("multipart/form-data")) {
    // return handlePdfUpload(req);
  }

  try {
    const { messages, resource_id, chatMode = "default" } = await req.json();

    logger.info(`💬 Modo de chat recibido: "${chatMode}"`);

    switch (chatMode) {
      case "rag":
        logger.info("🧠 Modo RAG seleccionado");
        // return handleRagChatRequest(req);                    // --> Función para manejar el chat en modo RAG
        return handleChatRequest(messages, resource_id);        // --> Implementación temporal mientras se crea el modo RAG

      case "workflow":
        logger.info("🔀 Modo Workflow seleccionado");
        // return handleWorkflowChatRequest(req);               // --> Función para manejar el chat en modo WORKFLOW
        return handleChatRequest(messages, resource_id);        // --> Implementación temporal mientras se crea el modo WORKFLOW

      default:
        logger.info("💬 Modo Default seleccionado");
        // return handleDefaultChatRequest(req);                // --> Función para manejar el chat en modo DEFAULT
        return handleChatRequest(messages, resource_id);        // --> Implementación temporal mientras se crea el modo DEFAULT
    }
  } catch (error) {
    logger.error("❌ Error interpretando el cuerpo del request", error);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
