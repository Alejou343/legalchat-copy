import logger from "@/lib/logger";
import { chatSystemPrompt, parseStepsSystemPrompt } from "@/lib/prompts";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import {
	streamText,
	generateText, // Retained as it's used by parseSteps
	generateObject,
	createDataStreamResponse,
	type DataStreamWriter,
	type Message,
	type CreateMessage,
} from "ai";
import { z } from "zod";

const MODEL_VERSION = "gpt-4o"; // For OpenAI

async function parseSteps(input: string) {
	try {
		logger.warn("⚠️ Trying to parse steps");
		const { object } = await generateObject({
			model: openai(MODEL_VERSION), // Uses OpenAI for parsing steps
			schema: z.object({
				steps: z.array(z.string()),
			}),
			system: parseStepsSystemPrompt(),
			prompt: input,
		});

		logger.info("✅ Parse steps completed");
		return object;
	} catch (err) {
		logger.error("❌ Cannot parse steps", err);
		return { steps: [] };
	}
}

export async function POST(req: Request) {
	let messages: Message[];
	let mode: string;
	let data:
		| {
				file?: {
					// File is optional
					name: string;
					type: string;
					content: string; // Expected to be a Data URL
				};
		  }
		| undefined; // data itself might be undefined

	logger.warn("⚠️ Trying to get messages, mode, and data");
	try {
		const body = await req.json();
		// Basic casting; in production, consider more robust validation (e.g., with Zod)
		messages = body.messages as Message[];
		mode = body.mode as string;
		data = body.data as typeof data;
		logger.info("✅ Messages, mode, and data retrieved successfully");
	} catch (err) {
		logger.error("❌ Cannot get messages, mode, and data from JSON body", err);
		return Response.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (mode === "default") {
		// Check for PDF file and process with Google Gemini if conditions are met
		if (
			data?.file &&
			data.file.type === "application/pdf" &&
			data.file.content
		) {
			logger.info(`✅ PDF file received: ${data.file.name}`);
			const lastMessage =
				messages.length > 0 ? messages[messages.length - 1] : null;

			// Check if the last message is a user text prompt to accompany the file
			if (
				lastMessage?.role === "user" &&
				typeof lastMessage.content === "string"
			) {
				logger.info(
					"ℹ️ Last message is a user text prompt. Preparing to process PDF using Google API.",
				);

				const userPromptForFile = lastMessage.content;

				const fileResult = streamText({
					model: google("gemini-2.5-flash-preview-04-17"),
					messages: [
						{
							role: "user",
							content: [
								{
									type: "text",
									text: userPromptForFile,
								},
								{
									type: "file",
									mimeType: "application/pdf",
									data: data?.file?.content ?? "",
								},
							],
						},
					],
				});
				return fileResult.toDataStreamResponse();
			}
			logger.warn(
				"⚠️ PDF file received, but the last message was not a suitable user text prompt. The PDF will not be processed. Falling through to default OpenAI stream.",
			);
			// If no suitable user prompt, the PDF is effectively ignored here,
			// and we proceed to the default OpenAI stream with original messages.
		}

		// Default OpenAI stream processing
		// This block is reached if:
		// 1. No file was provided.
		// 2. A file was provided but it wasn't a PDF or had no content.
		// 3. A PDF was provided, but the last message wasn't a user text prompt (triggering the fall-through).
		try {
			logger.warn(
				"⚠️ Starting default mode processing (OpenAI). Conditions for Gemini PDF stream not met or no PDF.",
			);
			const result = streamText({
				model: openai(MODEL_VERSION),
				system: chatSystemPrompt(),
				messages, // Original messages are used
			});
			logger.info(
				"✅ Default mode (OpenAI) processing completed. Returning DataStreamResponse.",
			);
			return result.toDataStreamResponse();
		} catch (error) {
			logger.error("❌ Error in default mode (OpenAI) processing", error);
			return Response.json(
				{ error: "Failed to process default mode with OpenAI" },
				{ status: 500 },
			);
		}
	} else if (mode === "workflow") {
		logger.warn("⚠️ Starting workflow mode processing");
		return createDataStreamResponse({
			async execute(dataStream: DataStreamWriter) {
				try {
					logger.warn("⚠️ Trying to parse steps from messages for workflow");
					if (
						messages.length === 0 ||
						typeof messages[messages.length - 1].content !== "string"
					) {
						logger.error(
							"❌ Cannot parse steps for workflow: Last message is not a string or messages array is empty.",
						);
						dataStream.writeData({
							error:
								"Cannot parse steps: Invalid messages format for workflow.",
						});
						return;
					}

					const { steps } = await parseSteps(
						messages[messages.length - 1].content as string,
					);
					logger.info(
						`✅ Parsed ${steps.length} steps successfully for workflow`,
					);

					if (steps.length === 0) {
						logger.warn("⚠️ No steps parsed for workflow. Finishing early.");
						dataStream.writeData({
							workflowSteps: [],
							currentStep: 0,
							isComplete: true,
							info: "No steps were parsed from the input for the workflow.",
						});
						return;
					}

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
							`⚠️ Processing workflow step ${i + 1}/${state.totalSteps}: ${step}`,
						);

						dataStream.writeData({
							workflowSteps: steps,
							currentStep: i,
							isComplete: false,
						});
						logger.info(`✅ Workflow step ${i} progress written successfully`);

						logger.warn(`⚠️ Generating text for workflow step ${i}`);
						const result = await generateText({
							// Intermediate steps use generateText
							model: openai(MODEL_VERSION),
							system: chatSystemPrompt(),
							prompt: `
                PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                CURRENT_STEP: ${step}
              `,
						});
						logger.info(
							`✅ Text generated successfully for workflow step ${i}`,
						);

						state.context.push(result.text);
						logger.info(`ℹ️ Context updated with workflow step ${i} result`);
					}

					const lastStep = state.steps[state.steps.length - 1];
					state.currentStep = state.steps.length - 1;
					logger.warn(`⚠️ Processing final workflow step: ${lastStep}`);

					dataStream.writeData({
						workflowSteps: steps,
						currentStep: state.currentStep,
						isComplete: false,
					});
					logger.info("✅ Final workflow step progress written successfully");

					logger.warn("⚠️ Generating final text stream for workflow");
					const finalResult = streamText({
						// Final step uses streamText
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
								"⚠️ Final text stream for workflow finished, marking complete",
							);
							dataStream.writeData({
								workflowSteps: steps,
								currentStep: state.currentStep,
								isComplete: true,
							});
							logger.info("✅ Workflow marked as complete in data stream");
						},
					});

					logger.warn("⚠️ Merging final workflow result into data stream");
					finalResult.mergeIntoDataStream(dataStream);
					logger.info(
						"✅ Final workflow result merged into data stream successfully",
					);
				} catch (error) {
					logger.error("❌ Error during workflow processing", error);
					try {
						logger.warn("⚠️ Writing error to data stream for workflow");
						dataStream.writeData({ error: "Workflow processing failed" });
					} catch (innerError) {
						logger.error(
							"❌ Failed to write error to data stream for workflow",
							innerError,
						);
					}
				} finally {
					logger.info(
						"ℹ️ Data stream lifecycle for workflow completed. Closing stream.",
					);
					// Ensure stream is closed
				}
			},
		});
	} else {
		logger.error(`❌ Invalid mode specified: ${mode}`);
		return Response.json({ error: "Invalid mode specified" }, { status: 400 });
	}
}