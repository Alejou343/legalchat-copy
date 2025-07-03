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
import {
  findRelevantContent,
  getTopChunksByResourceId,
} from "@/lib/ai/embedding";
import { rewriteUserQuery } from "@/lib/utils/reformulate-query";

/**
 * Main entry point for processing a legal letter in workflow mode.
 *
 * This function:
 * - Parses a list of steps from the user's message
 * - Sends real-time data updates via a stream
 * - Executes intermediate drafting steps
 * - Generates a final section to complete the document
 *
 * It uses retry mechanisms and conditional model logic based on the presence of an uploaded file.
 *
 * @async
 * @function
 * @param {CoreMessage[]} messages - The list of user-assistant messages.
 * @param {boolean} hasFile - Whether the user included a file in the request.
 * @returns {Promise<Response>} A streaming response of the generated letter content and progress.
 * @throws Will catch and stream any processing errors encountered during execution.
 */

export async function processWorkflowMode(
  messages: CoreMessage[],
  hasFile: boolean,
  anonymization: boolean,
  resourceId?: string
) {
  logger.warn("⚠️ Starting workflow mode processing");

  let augmentedMessages = messages;

  if (hasFile && resourceId) {
    try {
      const lastMessage = messages[messages.length - 1];
      const userInput = extractTextFromMessage(lastMessage);
      const reformulated = await rewriteUserQuery(userInput);

      let relevantChunks = await findRelevantContent(reformulated, resourceId);
      if (relevantChunks.length === 0) {
        const top = await getTopChunksByResourceId(resourceId, 4);
        relevantChunks = top.map((c) => ({ name: c.name, similarity: 1 }));
      }

      if (relevantChunks.length > 0) {
        const contextText = relevantChunks
          .map((c) => `• ${c.name}`)
          .join("\n");
        const systemContext: CoreMessage = {
          role: "system",
          content: `Contexto extraído del documento:\n${contextText}`,
        };
        augmentedMessages = [systemContext, ...messages];
      }
    } catch (err) {
      logger.error("❌ Error retrieving embeddings for workflow", err);
    }
  }

  return createDataStreamResponse({
    async execute(dataStream: DataStreamWriter) {
      try {
        // Parse steps
        logger.warn("⚠️ Trying to parse steps from messages");
        const lastMessage = augmentedMessages[augmentedMessages.length - 1];
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
        await processIntermediateSteps(
          state,
          dataStream,
          augmentedMessages,
          hasFile,
          anonymization
        );

        // Process final step
        await processFinalStep(
          state,
          dataStream,
          augmentedMessages,
          hasFile,
          anonymization
        );
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
 * Handles all intermediate steps in the legal document workflow.
 *
 * For each step:
 * - Selects a model and generates text for the given section
 * - Maintains context for accumulated content
 * - Streams step-by-step progress updates
 *
 * @async
 * @function
 * @param {Object} state - The current workflow state, including steps, context, and step counters.
 * @param {string[]} state.steps - Array of all parsed steps.
 * @param {number} state.currentStep - Index of the current step being processed.
 * @param {number} state.totalSteps - Total number of workflow steps.
 * @param {string[]} state.context - Accumulated previous section content for context.
 * @param {DataStreamWriter} dataStream - Stream interface to emit progress and data to client.
 * @param {CoreMessage[]} messages - Full conversation history.
 * @param {boolean} hasFile - Indicates whether a file was uploaded by the user.
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
  hasFile: boolean,
  anonymization: boolean
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
            system: chatSystemPrompt(anonymization),
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
 * Finalizes the legal letter by generating the last section using the current context.
 *
 * Depending on the presence of a file:
 * - Adjusts the prompt structure accordingly
 * - Streams the final section and signals workflow completion
 *
 * @async
 * @function
 * @param {Object} state - The current workflow state, including context and step counters.
 * @param {string[]} state.steps - Array of workflow steps.
 * @param {number} state.currentStep - Index of the current step being processed.
 * @param {number} state.totalSteps - Total number of workflow steps.
 * @param {string[]} state.context - Accumulated context from previous steps.
 * @param {DataStreamWriter} dataStream - Stream interface to emit progress and final content.
 * @param {CoreMessage[]} messages - Full conversation history.
 * @param {boolean} hasFile - Indicates whether a file was uploaded by the user.
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
  hasFile: boolean,
  anonymization: boolean
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
              content: buildFinalLegalLetterPrompt(state, lastStep, hasFile, anonymization),
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
          system: chatSystemPrompt(anonymization),
          temperature: 0,
          prompt: buildFinalLegalLetterPrompt(state, lastStep, hasFile, anonymization),
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
