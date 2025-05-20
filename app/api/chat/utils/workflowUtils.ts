import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import logger from "@/lib/logger";
import { parseStepsSystemPrompt } from "@/lib/prompts";
import { withRetry } from "./retryUtils";

/**
 * Parse workflow steps from input text
 */
export async function parseSteps(input: string) {
  try {
    logger.warn("⚠️ Trying to parse steps");
    const { object } = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o"), // Uses OpenAI for parsing steps
          schema: z.object({
            steps: z.array(z.string()),
          }),
          system: parseStepsSystemPrompt(),
          prompt: input,
        }),
      "parseSteps"
    );

    logger.info("✅ Parse steps completed");
    return object;
  } catch (err) {
    logger.error("❌ Cannot parse steps", err);
    return { steps: [] };
  }
}