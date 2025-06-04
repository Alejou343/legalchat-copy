import { streamText } from "ai";
import type { CoreMessage } from "ai";
import logger from "@/lib/logger";
import { chatSystemPrompt } from "@/lib/prompts";
import { withRetry } from "../retryUtils";
import { MODEL_CONSTANTS } from "../../constants/models";
import { bedrock } from "@ai-sdk/amazon-bedrock";

/**
 * Processes a request in the default mode, selecting the appropriate AI model
 * based on the presence of an attached file.
 *
 * If a file is present, uses Anthropic's reasoning model for more complex analysis.
 * If no file is present, uses the same model with an additional system prompt.
 *
 * This function wraps the model calls with a retry mechanism and streams
 * the response data back to the client.
 *
 * @async
 * @function
 * @param {CoreMessage[]} messages - The list of chat messages to process.
 * @param {boolean} hasFile - Indicates whether the user input includes a file.
 * @returns {Promise<Response>} A readable stream response containing the model's output.
 * @throws Will throw an error if processing fails after retries.
 */

export async function processDefaultMode(
  messages: CoreMessage[],
  hasFile: boolean,
  anonimization: boolean
) {
  try {
    logger.warn("⚠️ Starting default mode processing");

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    let result: any;

    if (hasFile) {
      // Use Anthropic for file processing
      result = await withRetry(
        async () =>
          streamText({
            model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
            // model: anthropic(MODEL_CONSTANTS.ANTHROPIC.DEFAULT),
            messages,
          }),
        "File processing with Anthropic"
      );
    } else {
      // Use OpenAI for non-file requests
      result = await withRetry(
        async () =>
          streamText({
            model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
            // model: anthropic(MODEL_CONSTANTS.ANTHROPIC.DEFAULT),
            system: chatSystemPrompt(anonimization),
            messages,
          }),
        "Default mode processing"
      );
    }

    logger.info("✅ Default mode processing completed");
    return result.toDataStreamResponse();
  } catch (error) {
    logger.error("❌ Error in default mode processing", error);
    throw error;
  }
}
