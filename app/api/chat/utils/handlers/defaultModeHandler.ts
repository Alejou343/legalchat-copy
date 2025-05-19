import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { CoreMessage } from "ai";
import logger from "@/lib/logger";
import { chatSystemPrompt } from "@/lib/prompts";
import { withRetry } from "../retryUtils";
import { MODEL_CONSTANTS } from "../../constants/models";

// Model constants

/**
 * Process requests in default mode
 */
export async function processDefaultMode(messages: CoreMessage[], hasFile: boolean) {
  try {
    logger.warn("⚠️ Starting default mode processing");
    
    let result;
    
    if (hasFile) {
      // Use Anthropic for file processing
      result = await withRetry(
        async () => 
          streamText({
            model: anthropic(MODEL_CONSTANTS.ANTHROPIC.DEFAULT),
            messages,
          }),
        "File processing with Anthropic"
      );
    } else {
      // Use OpenAI for non-file requests
      result = await withRetry(
        async () =>
          streamText({
            model: openai(MODEL_CONSTANTS.OPENAI.DEFAULT),
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