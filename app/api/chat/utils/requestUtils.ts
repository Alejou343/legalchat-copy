import logger from "@/lib/logger";
import { z } from "zod";
import type { NextRequest } from "next/server";
import type { CoreMessage, CoreUserMessage } from "ai";

/**
 * Validates and parses the incoming request
 */
export async function validateRequest(req: NextRequest) {
	try {
		const body = await req.json();
		const messages = body.messages;
		const mode = body.mode || "default";
		const hasFile = body.hasFile || false;
		const data = body.data || {};
		const email = body.email || '';

		logger.info(`Has a file: ${hasFile}`);
		logger.info("✅ Messages, mode, data and hasFile received successfully");

		return { messages, mode, hasFile, data, email };
	} catch (err) {
		logger.error("❌ Cannot get messages, mode, data and hasFile", err);
		throw new Error("Invalid JSON body");
	}
}

/**
 * Prepares messages with file content
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
 * Extract text content from a message
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