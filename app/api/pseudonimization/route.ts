import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import logger from "@/lib/logger";
import { pseudonimizationSystemPrompt } from "@/lib/prompts";
import { MODEL_CONSTANTS } from "../chat/constants/models";
import { bedrock } from "@ai-sdk/amazon-bedrock";

export async function POST(req: Request) {
  try {
    logger.warn("⚠️ Starting anonymization request processing");

    let message;
    try {
      logger.warn("⚠️ Trying to parse request body");
      const body = await req.json();
      message = body.message;
      logger.info(`✅ Request body parsed successfully. Message length: ${message.length}`);
    } catch (err) {
      logger.error("❌ Failed to parse request body");
      return Response.json(
        { error: "Invalid request body. Expected JSON with 'message' field" },
        { status: 400 }
      );
    }

    logger.warn("⚠️ Starting text anonymization");
    const result = await generateText({
      // model: groq(MODEL_CONSTANTS.GROQ.DEFAULT),
      model: bedrock(MODEL_CONSTANTS.ANTHROPIC.DEFAULT),
      system: pseudonimizationSystemPrompt(),
      prompt: message,
    });

    logger.info("✅ Text anonymization completed successfully");
    logger.info(`ℹ️ Original message length: ${message.length}, Anonymized length: ${result.text.length}`);

    return Response.json({ 
      message: result.text,
      originalLength: message.length,
      anonymizedLength: result.text.length
    });

  } catch (error) {
    logger.error("❌ Error during anonymization process");
    logger.error(`ℹ️ Error details: ${error instanceof Error ? error.message : String(error)}`);

    return Response.json(
      { 
        error: "Failed to process anonymization request",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}