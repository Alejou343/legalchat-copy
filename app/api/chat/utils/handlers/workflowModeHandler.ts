import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createDataStreamResponse, DataStreamWriter, streamText, generateText, CoreMessage } from "ai";
import logger from "@/lib/logger";
import { chatSystemPrompt } from "@/lib/prompts";
import { withRetry } from "../retryUtils";
import { parseSteps } from "../workflowUtils";
import { extractTextFromMessage } from "../requestUtils";
import { MODEL_CONSTANTS } from "../../constants/models";
/**
 * Process workflow mode requests
 */
export async function processWorkflowMode(messages: CoreMessage[], hasFile: boolean) {
  logger.warn("⚠️ Starting workflow mode processing");
  
  return createDataStreamResponse({
    async execute(dataStream: DataStreamWriter) {
      try {
        // Parse steps
        logger.warn("⚠️ Trying to parse steps from messages");
        const lastMessage = messages[messages.length - 1];
        const inputText = extractTextFromMessage(lastMessage);
        const { steps } = await parseSteps(inputText);
        logger.info(`✅ Parsed ${steps.length} steps successfully`);

        // Initialize state
        const state = {
          steps,
          currentStep: 0,
          totalSteps: steps.length,
          context: [] as string[],
        };

        // Write initial workflow data
        logger.warn("⚠️ Writing initial workflow data to stream");
        dataStream.writeData({
          workflowSteps: steps,
          currentStep: 0,
          isComplete: false,
        });
        logger.info("✅ Initial workflow data written successfully");

        // Process intermediate steps
        await processIntermediateSteps(state, dataStream, messages, hasFile);

        // Process final step
        await processFinalStep(state, dataStream, messages, hasFile);
      } catch (error) {
        logger.error(`❌ Error during workflow processing${hasFile ? ' with file' : ''}`, error);
        try {
          logger.warn("⚠️ Writing error to data stream");
          dataStream.writeData({ error: "Workflow processing failed" });
          logger.error("❌ Workflow processing failed");
        } catch (innerError) {
          logger.error("❌ Failed to write error to data stream", innerError);
        }
      } finally {
        logger.info("ℹ️ Data stream lifecycle completed");
      }
    },
  });
}

/**
 * Process intermediate workflow steps
 */
async function processIntermediateSteps(
  state: { steps: string[], currentStep: number, totalSteps: number, context: string[] },
  dataStream: DataStreamWriter,
  messages: CoreMessage[],
  hasFile: boolean
) {
  for (let i = 0; i < state.steps.length - 1; i++) {
    const step = state.steps[i];
    state.currentStep = i;
    logger.warn(`⚠️ Processing step ${i + 1}/${state.totalSteps}: ${step}`);

    // Update data stream with current step
    logger.warn(`⚠️ Writing step ${i} progress to stream`);
    dataStream.writeData({
      workflowSteps: state.steps,
      currentStep: i,
      isComplete: false,
    });
    logger.info(`✅ Step ${i} progress written successfully`);

    // Generate text for current step
    logger.warn(`⚠️ Generating text for step ${i}${hasFile ? ' with file' : ''}`);
    
    let result;
    if (hasFile) {
      // Use Anthropic for file-related steps
      result = await withRetry(
        () =>
          generateText({
            model: anthropic(MODEL_CONSTANTS.ANTHROPIC.DEFAULT),
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
        `Workflow step ${i} with file`
      );
    } else {
      // Use OpenAI for non-file steps
      result = await withRetry(
        () =>
          generateText({
            model: openai(MODEL_CONSTANTS.OPENAI.DEFAULT),
            system: chatSystemPrompt(),
            prompt: `
              PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
              CURRENT_STEP: ${step}
            `,
          }),
        `Workflow step ${i}`
      );
    }

    logger.info(`✅ Text generated successfully for step ${i}`);

    // Update context with result
    state.context.push(result.text);
    logger.info(`ℹ️ Context updated with step ${i} result`);
  }
}

/**
 * Process final workflow step
 */
async function processFinalStep(
  state: { steps: string[], currentStep: number, totalSteps: number, context: string[] },
  dataStream: DataStreamWriter,
  messages: CoreMessage[],
  hasFile: boolean
) {
  const lastStep = state.steps[state.steps.length - 1];
  state.currentStep = state.steps.length - 1;
  logger.warn(`⚠️ Processing final step${hasFile ? ' with file' : ''}: ${lastStep}`);

  // Update data stream with final step
  logger.warn("⚠️ Writing final step progress to stream");
  dataStream.writeData({
    workflowSteps: state.steps,
    currentStep: state.currentStep,
    isComplete: false,
  });
  logger.info("✅ Final step progress written successfully");

  // Generate text for final step
  logger.warn(`⚠️ Generating final text stream${hasFile ? ' with file' : ''}`);
  
  let finalResult;
  if (hasFile) {
    // Use Anthropic for file-related final step
    finalResult = await withRetry(
      async () =>
        streamText({
          model: anthropic(MODEL_CONSTANTS.ANTHROPIC.DEFAULT),
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
            logger.warn("⚠️ Final text stream finished, marking complete");
            dataStream.writeData({
              workflowSteps: state.steps,
              currentStep: state.currentStep,
              isComplete: true,
            });
            logger.info("✅ Workflow marked as complete in data stream");
          },
        }),
      "Final workflow step with file"
    );
  } else {
    // Use OpenAI for non-file final step
    finalResult = await withRetry(
      async () =>
        streamText({
          model: openai(MODEL_CONSTANTS.OPENAI.DEFAULT),
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
              workflowSteps: state.steps,
              currentStep: state.currentStep,
              isComplete: true,
            });
            logger.info("✅ Workflow marked as complete in data stream");
          },
        }),
      "Final workflow step"
    );
  }

  // Merge final result into data stream
  logger.warn("⚠️ Merging final result into data stream");
  finalResult.mergeIntoDataStream(dataStream);
  logger.info("✅ Final result merged into data stream successfully");
}