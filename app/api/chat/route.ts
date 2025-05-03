import logger from "@/lib/logger";
import { chatSystemPrompt, parseStepsSystemPrompt } from "@/lib/prompts";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  generateText,
  generateObject,
  createDataStreamResponse,
  type DataStreamWriter,
} from "ai";
import { z } from "zod";

const MODEL_VERSION = "gpt-4o";

async function parseSteps(input: string) {
  try {
    logger.warn("⚠️ Trying to parse steps");
    const { object } = await generateObject({
      model: openai(MODEL_VERSION),
      schema: z.object({
        steps: z.array(z.string()),
      }),
      system: parseStepsSystemPrompt(),
      prompt: input,
    });

    logger.info("✅ Parse steps completed");
    return object;
  } catch (err) {
    logger.error("❌ Cannot parse steps");
    return { steps: [] };
  }
}

export async function POST(req: Request) {
  let messages, mode;
  logger.warn('⚠️ Trying to get messages and mode')
  try {
    ({ messages, mode } = await req.json());
    logger.info('✅ Messages and mode get successfully')
  } catch (err) {
    logger.error("❌ Cannot get messages and mode");
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (mode === "default") {
    try {
      logger.warn("⚠️ Starting default mode processing");
      const result = streamText({
        model: openai(MODEL_VERSION),
        system: chatSystemPrompt(),
        messages,
      });
      logger.info("✅ Default mode processing completed");
      return result.toDataStreamResponse();
    } catch (error) {
      logger.error("❌ Error in default mode processing");
      return Response.json(
        { error: "Failed to process default mode" },
        { status: 500 }
      );
    }
  } else if (mode === "workflow") {
    logger.warn("⚠️ Starting workflow mode processing");
    return createDataStreamResponse({
      async execute(dataStream: DataStreamWriter) {
        try {
          logger.warn("⚠️ Trying to parse steps from messages");
          const { steps } = await parseSteps(
            messages[messages.length - 1].content
          );
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
            logger.warn(`⚠️ Processing step ${i + 1}/${state.totalSteps}: ${step}`);

            logger.warn(`⚠️ Writing step ${i} progress to stream`);
            dataStream.writeData({
              workflowSteps: steps,
              currentStep: i,
              isComplete: false,
            });
            logger.info(`✅ Step ${i} progress written successfully`);

            logger.warn(`⚠️ Generating text for step ${i}`);
            const result = await generateText({
              model: openai(MODEL_VERSION),
              system: chatSystemPrompt(),
              prompt: `
                PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                CURRENT_STEP: ${step}
              `,
            });
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
          const finalResult = streamText({
            model: openai(MODEL_VERSION),
            system: chatSystemPrompt(),
            temperature: 0,
            prompt: `
              PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
              CURRENT_STEP: ${lastStep}
              Generate the final answer for the user based on the PREVIOUS_CONTEXT and the CURRENT_STEP.
            `,
            onFinish: () => {
              logger.warn("⚠️ Final text stream finished, marking complete");
              dataStream.writeData({
                workflowSteps: steps,
                currentStep: state.currentStep,
                isComplete: true,
              });
              logger.info("✅ Workflow marked as complete in data stream");
            },
          });

          logger.warn("⚠️ Merging final result into data stream");
          await finalResult.mergeIntoDataStream(dataStream);
          logger.info("✅ Final result merged into data stream successfully");
        } catch (error) {
          logger.error("❌ Error during workflow processing");
          try {
            logger.warn("⚠️ Writing error to data stream");
            dataStream.writeData({ error: "Workflow processing failed" });
            logger.error("❌ Workflow processing failed");
          } catch (innerError) {
            logger.error("❌ Failed to write error to data stream");
          }
        } finally {
          logger.info("ℹ️ Data stream lifecycle completed");
        }
      },
    });
  } else {
    logger.error("❌ Invalid mode specified");
    return Response.json({ error: "Invalid mode specified" }, { status: 400 });
  }
}