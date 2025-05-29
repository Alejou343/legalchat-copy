import { generateObject } from "ai";
import { z } from "zod";
import logger from "@/lib/logger";
import { parseStepsSystemPrompt } from "@/lib/prompts";
import { withRetry } from "./retryUtils";
import { MODEL_CONSTANTS } from "../constants/models";
import { bedrock } from "@ai-sdk/amazon-bedrock";

/**
 * Parses workflow steps from a given input text using an AI model.
 *
 * This function uses a schema-based generative AI call to extract an array of steps
 * from the provided text. It includes retry logic for robustness and logs key actions.
 *
 * @param {string} input - The text input describing the steps to be parsed.
 * @returns {Promise<{ steps: string[] }>} An object containing the parsed steps.
 *
 * @example
 * const result = await parseSteps("1. Open the app\n2. Log in\n3. Start a new session");
 * console.log(result.steps); // ["Open the app", "Log in", "Start a new session"]
 */

export async function parseSteps(input: string) {
  try {
    logger.warn("⚠️ Trying to parse steps");
    const { object } = await withRetry(
      () =>
        generateObject({
          // model: openai(MODEL_CONSTANTS.OPENAI.DEFAULT), // Uses OpenAI for parsing steps
          model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
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
