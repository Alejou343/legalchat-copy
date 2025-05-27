import { streamText } from "ai";
import type { CoreMessage } from "ai";
import logger from "@/lib/logger";
import { chatSystemPrompt } from "@/lib/prompts";
import { withRetry } from "../retryUtils";
import { MODEL_CONSTANTS } from "../../constants/models";
import { bedrock } from '@ai-sdk/amazon-bedrock';

// Model constants

/**
 * Process requests in default mode
 */
export async function processDefaultMode(messages: CoreMessage[], hasFile: boolean) {
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
            system: chatSystemPrompt(),
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