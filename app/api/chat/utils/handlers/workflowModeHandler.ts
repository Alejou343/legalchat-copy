import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  createDataStreamResponse,
  type DataStreamWriter,
  streamText,
  generateText,
  type CoreMessage,
} from "ai";
import logger from "@/lib/logger";
import { buildFinalLegalLetterPrompt, chatSystemPrompt } from "@/lib/prompts";
import { withRetry } from "../retryUtils";
import { parseSteps } from "../workflowUtils";
import { extractTextFromMessage } from "../requestUtils";
import { MODEL_CONSTANTS } from "../../constants/models";
import { bedrock } from "@ai-sdk/amazon-bedrock";

/**
 * Main workflow processing function (entry point)
 */
export async function processWorkflowMode(
  messages: CoreMessage[],
  hasFile: boolean
) {
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
        logger.error(
          `❌ Error during workflow processing${hasFile ? " with file" : ""}`,
          error
        );
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
  state: {
    steps: string[];
    currentStep: number;
    totalSteps: number;
    context: string[];
  },
  dataStream: DataStreamWriter,
  messages: CoreMessage[],
  hasFile: boolean
) {
  for (let i = 0; i < state.steps.length - 1; i++) {
    const step = state.steps[i];
    state.currentStep = i;
    logger.warn(`⚠️ Processing step ${i + 1}/${state.totalSteps}: ${step}`);

    dataStream.writeData({
      workflowSteps: state.steps,
      currentStep: i,
      isComplete: false,
    });

    let result;
    if (hasFile) {
      result = await withRetry(
        () =>
          generateText({
            model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
            providerOptions: {
              bedrock: {
                reasoningConfig: {
                  type: "enabled",
                  budgetTokens: 1024,
                },
              },
            },
            messages: [
              ...messages,
              {
                role: "user",
                content: `
                  LEGAL DOCUMENT DRAFTING INSTRUCTIONS:
                  You are drafting section ${i + 1} of ${
                  state.totalSteps
                } for a formal legal letter.
                  
                  PREVIOUS SECTIONS: ${state.context.join("\n") || "None"}
                  
                  CURRENT SECTION REQUIREMENTS:
                  ${step}
                  
                  FORMAT RULES:
                  - Begin with "[SECTION ${i + 1}: ${
                  step.split(":")[0] || step
                }]"
                  - Use complete sentences
                  - Include statutory references
                  - Add "Important Note:" where applicable
                  - Maintain formal tone
                `,
              },
            ],
          }),
        `Workflow step ${i} with file`
      );
    } else {
      result = await withRetry(
        () =>
          generateText({
            model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
            providerOptions: {
              bedrock: {
                reasoningConfig: {
                  type: "enabled",
                  budgetTokens: 1024,
                },
              },
            },
            system: chatSystemPrompt(),
            prompt: `
              LEGAL DOCUMENT SECTION DRAFTING:
              Draft only section ${i + 1} of ${
              state.totalSteps
            } for the formal letter.
              
              SECTION REQUIREMENTS:
              ${step}
              
              PREVIOUS CONTEXT:
              ${state.context.join("\n") || "None"}
              
              OUTPUT REQUIREMENTS:
              - Begin with clear section header
              - Include all legal elements
              - Use proper citations
              - Maintain consistent format
            `,
          }),
        `Workflow step ${i}`
      );
    }
    // Add section marker to context
    state.context.push(`${result.text}`);
  }
}

/**
 * Process final workflow step
 */
async function processFinalStep(
  state: {
    steps: string[];
    currentStep: number;
    totalSteps: number;
    context: string[];
  },
  dataStream: DataStreamWriter,
  messages: CoreMessage[],
  hasFile: boolean
) {
  const lastStep = state.steps[state.steps.length - 1];
  state.currentStep = state.steps.length - 1;

  dataStream.writeData({
    workflowSteps: state.steps,
    currentStep: state.currentStep,
    isComplete: false,
  });

  let finalResult;
  if (hasFile) {
    finalResult = await withRetry(
      async () =>
        streamText({
          model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
          messages: [
            ...messages,
            {
              role: "user",
              content: buildFinalLegalLetterPrompt(state, lastStep, hasFile),
            },
          ],
          onFinish: () => {
            dataStream.writeData({
              workflowSteps: state.steps,
              currentStep: state.currentStep,
              isComplete: true,
            });
          },
        }),
      "Final workflow step with file"
    );
  } else {
    finalResult = await withRetry(
      async () =>
        streamText({
          model: bedrock(MODEL_CONSTANTS.ANTHROPIC.REASONING),
          system: chatSystemPrompt(),
          temperature: 0,
          prompt: buildFinalLegalLetterPrompt(state, lastStep, hasFile),
          onFinish: () => {
            dataStream.writeData({
              workflowSteps: state.steps,
              currentStep: state.currentStep,
              isComplete: true,
            });
          },
        }),
      "Final workflow step"
    );
  }

  finalResult.mergeIntoDataStream(dataStream);
}
