import logger from "@/lib/logger";
import type { NextRequest } from "next/server";
import type { CoreMessage, CoreUserMessage } from "ai";

/**
 * Validates and parses the incoming HTTP request body.
 *
 * @param {NextRequest} req - The incoming Next.js request object.
 * @returns {Promise<{
 *   messages: CoreMessage[],
 *   mode: string,
 *   hasFile: boolean,
 *   data: Record<string, any>,
 *   email: string
 * }>} An object containing parsed request data.
 * @throws {Error} If the JSON body is invalid or cannot be parsed.
 *
 * @example
 * const { messages, mode, hasFile, data, email } = await validateRequest(req);
 */

export async function validateRequest(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages;
    const mode = body.mode || "default";
    const hasFile = body.hasFile || false;
    const data = body.data || {};
    const email = body.email || "";
    const anonimization = body.anonimization || false;
    const resource_id = body.resource_id || data.resource_id;

    logger.info(`Has a file: ${hasFile}`);
    logger.info("✅ Messages, mode, data and hasFile received successfully");

    return {
      messages,
      mode,
      hasFile,
      data,
      email,
      anonimization,
      resource_id,
    };
  } catch (err) {
    logger.error("❌ Cannot get messages, mode, data and hasFile", err);
    throw new Error("Invalid JSON body");
  }
}

/**
 * Prepares user messages by including file content if provided.
 *
 * @param {CoreMessage[]} messages - Array of chat messages.
 * @param {{ file?: { name: string, type: string, content: string } }} data - Optional file metadata and base64 content.
 * @returns {Promise<CoreMessage[]>} Updated messages array including the file as a message.
 * @throws {Error} If the file processing fails.
 *
 * @example
 * const updatedMessages = await prepareFileMessage(messages, { file });
 */

export async function prepareFileMessage(
	messages: CoreMessage[],
	data: {
		file?: {
			name: string;
			type: string;
			content: string;
		};
	},
) {
	logger.warn("⚠️ File detected, processing file");
	try {
		const lastMessage = messages.pop();

		if (Object.keys(data).length === 0) {
			logger.info(
				"No file data provided, pushing last message back to messages array",
			);
			if (lastMessage !== undefined) {
				messages.push(lastMessage);
			}
		} else {
			logger.info("File data provided, preparing file message for processing");
			const fileMessage: CoreUserMessage = {
				role: "user",
				content: [
					{
						type: "text",
						text:
							typeof lastMessage?.content === "string"
								? lastMessage.content
								: Array.isArray(lastMessage?.content)
									? lastMessage?.content
											.filter(
												(part: any) =>
													part.type === "text" && typeof part.text === "string",
											)
											.map((part: any) => part.text)
											.join("\n")
									: "",
					},
					{
						type: "file",
						data: data.file?.content ?? "",
						mimeType: data.file?.type ?? "",
						providerOptions: {
							anthropic: { cacheControl: { type: "ephemeral" } },
						},
					},
				],
			};
			messages.push(fileMessage);
		}

		return messages;
	} catch (error) {
		logger.error("❌ Error processing file", error);
		throw new Error("Failed to process file");
	}
}

/**
 * Extracts plain text from a message regardless of its internal format.
 *
 * @param {CoreMessage} message - The message object to extract text from.
 * @returns {string} The extracted text content.
 *
 * @example
 * const text = extractTextFromMessage(message);
 */

export function extractTextFromMessage(message: CoreMessage): string {
	const content = message.content;

	if (typeof content === "string") {
		return content;
	}
	if (Array.isArray(content)) {
		return content
			.filter(
				(part: any) => part.type === "text" && typeof part.text === "string",
			)
			.map((part: any) => part.text)
			.join("\n");
	}

	return "";
}