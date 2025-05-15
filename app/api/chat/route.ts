import { findRelevantContent } from "@/lib/ai/embedding";
import logger from "@/lib/logger";
import { chatSystemPrompt, parseStepsSystemPrompt } from "@/lib/prompts";
import { createResource } from "@/lib/actions/resources";
import { openai } from "@ai-sdk/openai";
import {
  streamText,
  generateText,
  generateObject,
  createDataStreamResponse,
  type DataStreamWriter,
  type Message,
  tool,
} from "ai";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { extractTextWithPdfParse } from "@/lib/utils/pdf-utils";

const MODEL_VERSION = "gpt-4o";

// Función para parsear pasos del workflow
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

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  logger.warn("⚠️ Iniciando procesamiento de solicitud");

  // Manejo de subida de archivos PDF
  if (contentType.includes("multipart/form-data")) {
    logger.warn("⚠️ Detectado archivo PDF en multipart/form-data");
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file || file.type !== "application/pdf") {
        logger.error("❌ Archivo PDF inválido o faltante");
        return new Response(
          JSON.stringify({ error: "Archivo PDF inválido o faltante" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        logger.error("❌ Archivo PDF excede tamaño permitido (10MB)");
        return new Response(
          JSON.stringify({
            error: "El archivo PDF es demasiado grande (máximo 10MB)",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const content = await extractTextWithPdfParse(buffer);

      const processedContent = content.replace(/\s+/g, " ").trim();
      logger.info("✅ Texto del PDF procesado correctamente");

      const resourceResponse = await createResource({
        content: processedContent,
      });
      const { resource_id } = resourceResponse;
      logger.info("✅ Recurso creado en la base de conocimiento");

      return new Response(
        JSON.stringify({
          message: "Documento procesado exitosamente",
          filename: file.name,
          contentLength: processedContent.length,
          resource_id: resource_id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      logger.error("❌ Error procesando archivo PDF", error);
      return new Response(
        JSON.stringify({ error: "Error al procesar el documento PDF" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Procesamiento de modo de chat (default y workflow)
  try {
    let messages: Message[];
    let mode: string;
    let resource_id: string = "";
    let data: {
      file?: {
        name: string;
        type: string;
        content: string; // Sending as Data URL
      };
    } = {};

    logger.warn("⚠️ Trying to get messages, mode and resource_id");

    try {
      const body = await req.json();
      messages = body.messages;
      mode = body.mode || "default";
      resource_id = body.resource_id || "";
      data = body.data || {};

      logger.info("✅ Messages, mode and resource_id get successfully");
    } catch (err) {
      logger.error("❌ Cannot get messages and mode");
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Procesamiento en modo default
    if (mode === "default") {
      try {
        logger.warn("⚠️ Starting default mode processing");

        const lastUserMessage = messages[messages.length - 1].content;
        const relevantContent = await findRelevantContent(
          lastUserMessage,
          resource_id
        );

        // Sistema de prompts mejorado con RAG
        const enhancedSystemPrompt = `
        # Role
        You are a context-aware assistant that provides accurate answers based strictly on retrieved knowledge.
        
        # Context
        ${relevantContent.map((x) => `• ${x.name}`).join("\n")}
        
        ${chatSystemPrompt()}
        
        # Instructions
        1. FIRST analyze if the context contains relevant information for: "${lastUserMessage}"
        2. IF RELEVANT INFORMATION EXISTS:
           - Synthesize a clear answer
           - Reference the context implicitly (e.g., "Based on the information...")
        3. IF NO RELEVANT INFORMATION:
           - Respond based on your general knowledge
        4. FOR AMBIGUOUS QUESTIONS:
           - Mention potential related content from context
           - Ask clarifying questions
        `;

        const result = streamText({
          model: openai(MODEL_VERSION),
          system: enhancedSystemPrompt,
          temperature: 0.4,
          maxSteps: 5,
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

      // Procesamiento en modo workflow
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
              logger.warn(
                `⚠️ Processing step ${i + 1}/${state.totalSteps}: ${step}`
              );

              logger.warn(`⚠️ Writing step ${i} progress to stream`);
              dataStream.writeData({
                workflowSteps: steps,
                currentStep: i,
                isComplete: false,
              });
              logger.info(`✅ Step ${i} progress written successfully`);

              // Obtener contenido relevante para este paso si hay un resource_id
              const relevantContent = resource_id
                ? await findRelevantContent(step, resource_id)
                : [];

              const contextPrompt =
                relevantContent.length > 0
                  ? `
                RELEVANT_CONTEXT: 
                ${relevantContent.map((x) => x.name).join("\n")}
                
                PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                CURRENT_STEP: ${step}
                `
                  : `
                PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
                CURRENT_STEP: ${step}
                `;

              logger.warn(`⚠️ Generating text for step ${i}`);
              const result = await generateText({
                model: openai(MODEL_VERSION),
                system: chatSystemPrompt(),
                prompt: contextPrompt,
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

            // Obtener contenido relevante para el paso final si hay un resource_id
            const finalRelevantContent = resource_id
              ? await findRelevantContent(lastStep, resource_id)
              : [];

            const finalContextPrompt =
              finalRelevantContent.length > 0
                ? `
              RELEVANT_CONTEXT: 
              ${finalRelevantContent.map((x) => x.name).join("\n")}
              
              PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
              CURRENT_STEP: ${lastStep}
              Generate the final answer for the user based on the RELEVANT_CONTEXT, PREVIOUS_CONTEXT and the CURRENT_STEP.
              `
                : `
              PREVIOUS_CONTEXT: ${state.context.join("\n") || "None"}
              CURRENT_STEP: ${lastStep}
              Generate the final answer for the user based on the PREVIOUS_CONTEXT and the CURRENT_STEP.
              `;

            logger.warn("⚠️ Generating final text stream");
            const finalResult = streamText({
              model: openai(MODEL_VERSION),
              system: chatSystemPrompt(),
              temperature: 0,
              prompt: finalContextPrompt,
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
      return Response.json(
        { error: "Invalid mode specified" },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("❌ Error general en procesamiento", error);
    return Response.json(
      { error: "Error procesando la solicitud" },
      { status: 500 }
    );
  }
}
