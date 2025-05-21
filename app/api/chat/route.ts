import logger from "@/lib/logger";
import type { NextRequest } from "next/server";
import { processDefaultMode } from "./utils/handlers/defaultModeHandler";
import { processWorkflowMode } from "./utils/handlers/workflowModeHandler";
import { validateRequest, prepareFileMessage } from "./utils/requestUtils";
import { handlePdfUpload } from "@/lib/handlers/pdf-upload-handler";

export async function POST(req: NextRequest) {
	try {
		// Parse and validate request
		const { messages, mode, hasFile, data } = await validateRequest(req);

		// Process requests based on whether they have a file or not
		if (hasFile) {
			try {
				// Process file message if present
				// const fileUpload = await handlePdfUpload(data)
				const processedMessages = await prepareFileMessage(messages, data);

				// Process based on mode
				if (mode === "default") {
					return await processDefaultMode(processedMessages, true);
				}
				if (mode === "workflow") {
					return await processWorkflowMode(processedMessages, true);
				}

				logger.error("❌ Invalid mode specified");
				return Response.json(
					{ error: "Invalid mode specified" },
					{ status: 400 },
				);
			} catch (error) {
				logger.error("❌ Error processing file request", error);
				return Response.json(
					{ error: "Failed to process file request" },
					{ status: 500 },
				);
			}
		} else {
			// Process non-file requests
			try {
				if (mode === "default") {
					return await processDefaultMode(messages, false);
				}
				if (mode === "workflow") {
					return await processWorkflowMode(messages, false);
				}
				logger.error("❌ Invalid mode specified");
				return Response.json(
					{ error: "Invalid mode specified" },
					{ status: 400 },
				);
			} catch (error) {
				logger.error("❌ Error processing non-file request", error);
				return Response.json(
					{ error: "Failed to process request" },
					{ status: 500 },
				);
			}
		}
	} catch (error) {
		logger.error("❌ Error general en procesamiento", error);
		return Response.json(
			{ error: "Error procesando la solicitud" },
			{ status: 500 },
		);
	}
}