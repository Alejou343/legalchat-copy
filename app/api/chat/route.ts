import logger from "@/lib/logger";
import { chatSystemPrompt, parseStepsSystemPrompt } from "@/lib/prompts";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
// import { google } from "@ai-sdk/google";
import {
	streamText,
	generateText, // Retained as it's used by parseSteps
	generateObject,
	createDataStreamResponse,
	type DataStreamWriter,
	type CoreMessage,
	type CoreUserMessage,
} from "ai";
import { z } from "zod";
import type { NextRequest } from "next/server";

const MODEL_VERSION = "gpt-4o"; // For OpenAI
// const GOOGLE_MODEL_VERSION = "gemini-2.5-flash-preview-04-17"; // For Google
const ANTHROPIC_MODEL_VERSION = "claude-3-7-sonnet-20250219"; // For Anthropic

// Retry configuration
const RETRY_CONFIG = {
	maxRetries: 5,
	initialDelayMs: 1000, // 1 second
	maxDelayMs: 32000, // 32 seconds
	backoffFactor: 2, // Exponential factor
	jitterFactor: 0.25, // Add some randomness to prevent thundering herd
};

/**
 * Sleep function for delay in retries
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculate backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number): number {
	const baseDelay = Math.min(
		RETRY_CONFIG.maxDelayMs,
		RETRY_CONFIG.initialDelayMs * RETRY_CONFIG.backoffFactor ** attempt,
	);

	// Add jitter to prevent all retries happening at the same time
	const jitter = RETRY_CONFIG.jitterFactor * baseDelay;
	return baseDelay + (Math.random() * 2 - 1) * jitter;
}

/**
 * Retry wrapper for API calls
 */
async function withRetry<T>(
	operation: () => Promise<T>,
	operationName: string,
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
		try {
			logger.info(
				`Attempting ${operationName} (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`,
			);
			return await operation();
		} catch (error: unknown) {
			lastError = error;

			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const errorObj: any = error;
			const status =
				errorObj?.status || errorObj?.statusCode || errorObj?.response?.status;

			// Only retry on specific status codes that indicate temporary issues
			const retryableStatusCodes = [429, 500, 502, 503, 504, 529];
			const isRetryable = retryableStatusCodes.includes(status);

			if (!isRetryable) {
				logger.error(`Non-retryable error in ${operationName}:`, error);
				throw error;
			}

			if (attempt < RETRY_CONFIG.maxRetries - 1) {
				const delayMs = calculateBackoffDelay(attempt);
				logger.warn(
					`${operationName} failed with status ${status}. Retrying in ${delayMs}ms...`,
				);
				await sleep(delayMs);
			} else {
				logger.error(
					`${operationName} failed after ${RETRY_CONFIG.maxRetries} attempts:`,
					error,
				);
			}
		}
	}

	throw lastError;
}

async function parseSteps(input: string) {
	try {
		logger.warn("⚠️ Trying to parse steps");
		const { object } = await withRetry(
			() =>
				generateObject({
					model: openai(MODEL_VERSION), // Uses OpenAI for parsing steps
					schema: z.object({
						steps: z.array(z.string()),
					}),
					system: parseStepsSystemPrompt(),
					prompt: input,
				}),
			"parseSteps",
		);

		logger.info("✅ Parse steps completed");
		return object;
	} catch (err) {
		logger.error("❌ Cannot parse steps", err);
		return { steps: [] };
	}
}

export async function POST(req: NextRequest) {
	try {
		let messages: CoreMessage[];
		let mode: string;
		let hasFile: boolean;
		let data: {
			file?: {
				name: string;
				type: string;
				content: string; // Sending as Data URL
			};
		} = {};

		try {
			const body = await req.json();
			messages = body.messages;
			mode = body.mode || "default";
			hasFile = body.hasFile || false;
			data = body.data || {};

			logger.info(`Has a file: ${body.hasFile}`);
			logger.info("✅ Messages, mode, data and hasFile received successfully");
		} catch (err) {
			logger.error("❌ Cannot get messages, mode, data and hasFile", err);
			return Response.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		if (hasFile) {
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
					logger.info(
						"File data provided, preparing file message for processing",
					);
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
														// biome-ignore lint/suspicious/noExplicitAny: <explanation>
														(part: any) =>
															part.type === "text" &&
															typeof part.text === "string",
													)
													// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
			} catch (error) {
				logger.error("❌ Error processing file", error);
				return Response.json(
					{ error: "Failed to process file" },
					{ status: 500 },
				);
			}
			// Process file requests based on mode
			if (mode === "default") {
				try {
					const result = await withRetry(
						async () =>
							streamText({
								model: anthropic(ANTHROPIC_MODEL_VERSION),
								messages,
							}),
						"File processing with Anthropic",
					);

					logger.info("✅ File processed successfully");
					return result.toDataStreamResponse();
				} catch (error) {
					logger.error("❌ Error in file processing with Anthropic", error);
					return Response.json(
						{ error: "Failed to process file" },
						{ status: 500 },
					);
				}
			} else if (mode === "workflow") {
				logger.warn("⚠️ Starting workflow mode processing with file");
				return createDataStreamResponse({
					async execute(dataStream: DataStreamWriter) {
						try {
							logger.warn("⚠️ Trying to parse steps from messages with file");
							const lastMessageContent = messages[messages.length - 1].content;
							let inputText = "";
							if (typeof lastMessageContent === "string") {
								inputText = lastMessageContent;
							} else if (Array.isArray(lastMessageContent)) {
								inputText = lastMessageContent
									.filter(
										// biome-ignore lint/suspicious/noExplicitAny: <explanation>
										(part: any) =>
											part.type === "text" && typeof part.text === "string",
									)
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									.map((part: any) => part.text)
									.join("\n");
							}
							const { steps } = await parseSteps(inputText);
							logger.info(
								`✅ Parsed ${steps.length} steps successfully with file`,
							);

							const state = {
								steps,
								currentStep: 0,
								totalSteps: steps.length,
								context: [] as string[],
							};

							logger.warn("⚠️ Writing initial workflow data to stream");
							dataStream.writeData({
								workflowSteps: steps,
								currentStep: 0,
								isComplete: false,
							});
							logger.info("✅ Initial workflow data written successfully");

							for (let i = 0; i < state.steps.length - 1; i++) {
								const step = state.steps[i];
								state.currentStep = i;
								logger.warn(
									`⚠️ Processing step ${i + 1}/${state.totalSteps}: ${step}`,
								);

								logger.warn(`⚠️ Writing step ${i} progress to stream`);
								dataStream.writeData({
									workflowSteps: steps,
									currentStep: i,
									isComplete: false,
								});
								logger.info(`✅ Step ${i} progress written successfully`);

								logger.warn(`⚠️ Generating text for step ${i} with file`);
								// Use Anthropic for intermediate steps when a file is involved
								const result = await withRetry(
									() =>
										generateText({
											model: anthropic(ANTHROPIC_MODEL_VERSION),
											messages: [
												...messages,
												{
													role: "user",
													content: `
                                PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                                CURRENT_STEP: ${step}
                                Please analyze the file provided and complete this step.
                              `,
												},
											],
										}),
									`Workflow step ${i} with file`,
								);

								logger.info(`✅ Text generated successfully for step ${i}`);

								state.context.push(result.text);
								logger.info(`ℹ️ Context updated with step ${i} result`);
							}

							const lastStep = state.steps[state.steps.length - 1];
							state.currentStep = state.steps.length - 1;
							logger.warn(`⚠️ Processing final step with file: ${lastStep}`);

							logger.warn("⚠️ Writing final step progress to stream");
							dataStream.writeData({
								workflowSteps: steps,
								currentStep: state.currentStep,
								isComplete: false,
							});
							logger.info("✅ Final step progress written successfully");

							logger.warn("⚠️ Generating final text stream with file");
							const finalResult = await withRetry(
								async () =>
									streamText({
										model: anthropic(ANTHROPIC_MODEL_VERSION),
										messages: [
											...messages,
											{
												role: "user",
												content: `
                            PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                            CURRENT_STEP: ${lastStep}
                            Generate the final answer for the user based on the PREVIOUS_CONTEXT, the CURRENT_STEP, and the file that was provided.
                          `,
											},
										],
										onFinish: () => {
											logger.warn(
												"⚠️ Final text stream finished, marking complete",
											);
											dataStream.writeData({
												workflowSteps: steps,
												currentStep: state.currentStep,
												isComplete: true,
											});
											logger.info(
												"✅ Workflow marked as complete in data stream",
											);
										},
									}),
								"Final workflow step with file",
							);

							logger.warn("⚠️ Merging final result into data stream");
							finalResult.mergeIntoDataStream(dataStream);
							logger.info(
								"✅ Final result merged into data stream successfully",
							);
						} catch (error) {
							logger.error(
								"❌ Error during workflow processing with file",
								error,
							);
							try {
								logger.warn("⚠️ Writing error to data stream");
								dataStream.writeData({ error: "Workflow processing failed" });
								logger.error("❌ Workflow processing failed");
							} catch (innerError) {
								logger.error(
									"❌ Failed to write error to data stream",
									innerError,
								);
							}
						} finally {
							logger.info("ℹ️ Data stream lifecycle completed");
						}
					},
				});
			}
		} else {
			// Non-file request processing
			if (mode === "default") {
				try {
					logger.warn("⚠️ Starting default mode processing");
					const result = await withRetry(
						async () =>
							streamText({
								model: openai(MODEL_VERSION),
								system: chatSystemPrompt(),
								messages,
							}),
						"Default mode processing",
					);

					logger.info("✅ Default mode processing completed");
					return result.toDataStreamResponse();
				} catch (error) {
					logger.error("❌ Error in default mode processing", error);
					return Response.json(
						{ error: "Failed to process default mode" },
						{ status: 500 },
					);
				}
			} else if (mode === "workflow") {
				logger.warn("⚠️ Starting workflow mode processing");
				return createDataStreamResponse({
					async execute(dataStream: DataStreamWriter) {
						try {
							logger.warn("⚠️ Trying to parse steps from messages");
							const lastMessageContent = messages[messages.length - 1].content;
							let inputText = "";
							if (typeof lastMessageContent === "string") {
								inputText = lastMessageContent;
							} else if (Array.isArray(lastMessageContent)) {
								inputText = lastMessageContent
									.filter(
										// biome-ignore lint/suspicious/noExplicitAny: <explanation>
										(part: any) =>
											part.type === "text" && typeof part.text === "string",
									)
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									.map((part: any) => part.text)
									.join("\n");
							}
							const { steps } = await parseSteps(inputText);
							logger.info(`✅ Parsed ${steps.length} steps successfully`);

							const state = {
								steps,
								currentStep: 0,
								totalSteps: steps.length,
								context: [] as string[],
							};

							logger.warn("⚠️ Writing initial workflow data to stream");
							dataStream.writeData({
								workflowSteps: steps,
								currentStep: 0,
								isComplete: false,
							});
							logger.info("✅ Initial workflow data written successfully");

							for (let i = 0; i < state.steps.length - 1; i++) {
								const step = state.steps[i];
								state.currentStep = i;
								logger.warn(
									`⚠️ Processing step ${i + 1}/${state.totalSteps}: ${step}`,
								);

								logger.warn(`⚠️ Writing step ${i} progress to stream`);
								dataStream.writeData({
									workflowSteps: steps,
									currentStep: i,
									isComplete: false,
								});
								logger.info(`✅ Step ${i} progress written successfully`);

								logger.warn(`⚠️ Generating text for step ${i}`);
								const result = await withRetry(
									() =>
										generateText({
											model: openai(MODEL_VERSION),
											system: chatSystemPrompt(),
											prompt: `
                    PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                    CURRENT_STEP: ${step}
                  `,
										}),
									`Workflow step ${i}`,
								);

								logger.info(`✅ Text generated successfully for step ${i}`);

								state.context.push(result.text);
								logger.info(`ℹ️ Context updated with step ${i} result`);
							}

							const lastStep = state.steps[state.steps.length - 1];
							state.currentStep = state.steps.length - 1;
							logger.warn(`⚠️ Processing final step: ${lastStep}`);

							logger.warn("⚠️ Writing final step progress to stream");
							dataStream.writeData({
								workflowSteps: steps,
								currentStep: state.currentStep,
								isComplete: false,
							});
							logger.info("✅ Final step progress written successfully");

							logger.warn("⚠️ Generating final text stream");
							const finalResult = await withRetry(
								async () =>
									streamText({
										model: openai(MODEL_VERSION),
										system: chatSystemPrompt(),
										temperature: 0,
										prompt: `
                  PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                  CURRENT_STEP: ${lastStep}
                  Generate the final answer for the user based on the PREVIOUS_CONTEXT and the CURRENT_STEP.
                `,
										onFinish: () => {
											logger.warn(
												"⚠️ Final text stream finished, marking complete",
											);
											dataStream.writeData({
												workflowSteps: steps,
												currentStep: state.currentStep,
												isComplete: true,
											});
											logger.info(
												"✅ Workflow marked as complete in data stream",
											);
										},
									}),
								"Final workflow step",
							);

							logger.warn("⚠️ Merging final result into data stream");
							finalResult.mergeIntoDataStream(dataStream);
							logger.info(
								"✅ Final result merged into data stream successfully",
							);
						} catch (error) {
							logger.error("❌ Error during workflow processing", error);
							try {
								logger.warn("⚠️ Writing error to data stream");
								dataStream.writeData({ error: "Workflow processing failed" });
								logger.error("❌ Workflow processing failed");
							} catch (innerError) {
								logger.error(
									"❌ Failed to write error to data stream",
									innerError,
								);
							}
						} finally {
							logger.info("ℹ️ Data stream lifecycle completed");
						}
					},
				});
			} else {
				logger.error("❌ Invalid mode specified");
				return Response.json(
					{ error: "Invalid mode specified" },
					{ status: 400 },
				);
			}
		}
		// This catch-all error response is needed in case no path above returns a response
		logger.error("❌ No response was generated by any of the processing paths");
		return Response.json(
			{ error: "Failed to process request" },
			{ status: 500 },
		);
	} catch (error) {
		logger.error("❌ Error general en procesamiento", error);
		return Response.json(
			{ error: "Error procesando la solicitud" },
			{ status: 500 },
		);
	}
}