import logger from "@/lib/logger";
import type { NextRequest } from "next/server";
import { processDefaultMode } from "./utils/handlers/defaultModeHandler";
import { processWorkflowMode } from "./utils/handlers/workflowModeHandler";
import { validateRequest, prepareFileMessage } from "./utils/requestUtils";
import { handlePdfUpload } from "@/lib/handlers/pdf-upload-handler";

/**
 * Handles POST requests for processing messages with optional file data.
 *
 * This function validates the incoming request, checks the mode ("default" or "workflow"),
 * processes messages accordingly (including file handling if present),
 * and delegates to the appropriate handler function.
 *
 * @param {NextRequest} req - The incoming Next.js request object.
 * @returns {Promise<Response>} A JSON response with the result or an error message.
 *
 * @throws Will return a 400 response if an invalid mode is specified.
 * @throws Will return a 500 response if there is an error processing the request.
 *
 * @example
 * // Used as an API route handler in Next.js
 * export async function POST(req: NextRequest) {
 *   // ...function logic
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, hasFile, data, email, anonimization } = await validateRequest(req)
    const isDefault = mode === "default"
    const isWorkflow = mode === "workflow"

    if (!isDefault && !isWorkflow) {
      return Response.json({ error: "Invalid mode specified" }, { status: 400 })
    }

    const processedMessages = hasFile
<<<<<<< HEAD
      // 🛠️ Paso mensajes aquí como primer argumento
      ? await handlePdfUpload(messages, data, email)
      : messages

    const handler = isDefault ? processDefaultMode : processWorkflowMode
    return await handler(processedMessages, hasFile, anonimization)
=======
		  ? await handlePdfUpload(data, email)
      // ? await prepareFileMessage(messages, data) // Current RAG Architecture --> Above new
      : messages;
>>>>>>> 2a40a2b56264c29eb6fac0ac4d73011141a12913

  } catch (error) {
    logger.error("❌ Error procesando la solicitud", error)
    return Response.json({ error: "Error procesando la solicitud" }, { status: 500 })
  }
}

