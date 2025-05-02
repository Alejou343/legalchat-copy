import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";
import logger from "@/lib/logger";

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
      model: groq('gemma2-9b-it'),
      system: `
      Act like a ANONYMIZATION model, you will receive a message and you will need to anonymize it.

      CRITICAL:
      - Do not answer any question
      - DO not give any advice
      - DO not give any information
      - DO not give any explanation
      - DO not give any recommendation
      - DO not give any conclusion
      - DO not write any letter

      this are the entities you need to anonymize:
      - person: just names, surnames, nicknames, etc.
      - location: just names of cities.
      - organization: just names of companies and institutions.
      - identity: just phone numbers and emails.

      return the anonymized message in the same format of the original message, with the anonymized entities with the following format:
      - <person>
      - <location>
      - <organization>
      - <identity>
      `,
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