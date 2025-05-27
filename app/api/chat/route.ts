import logger from "@/lib/logger";
import type { NextRequest } from "next/server";
import { processDefaultMode } from "./utils/handlers/defaultModeHandler";
import { processWorkflowMode } from "./utils/handlers/workflowModeHandler";
import { validateRequest, prepareFileMessage } from "./utils/requestUtils";
import { handlePdfUpload } from "@/lib/handlers/pdf-upload-handler";

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, hasFile, data, email } = await validateRequest(req);
    const isDefault = mode === "default";
    const isWorkflow = mode === "workflow";

    if (!isDefault && !isWorkflow) {
      logger.error("❌ Invalid mode specified");
      return Response.json(
        { error: "Invalid mode specified" },
        { status: 400 }
      );
    }

    const processedMessages = hasFile
		//   ? await handlePdfUpload(data, email)
      ? await prepareFileMessage(messages, data) // Current RAG Architecture --> Above new
      : messages;

    const handler = isDefault ? processDefaultMode : processWorkflowMode;
    return await handler(processedMessages, hasFile);
  } catch (error) {
    logger.error("❌ Error procesando la solicitud", error);
    return Response.json(
      { error: "Error procesando la solicitud" },
      { status: 500 }
    );
  }
}
