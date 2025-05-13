import logger from "@/lib/logger"; 
import { createResource } from "@/lib/actions/resources";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { NextRequest } from "next/server";
import { findRelevantContent } from "@/lib/ai/embedding";

async function extractTextWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    logger.warn("⚠️ Extrayendo texto del PDF");
    const { default: pdfParse } = await import("pdf-parse");
    const data = await pdfParse(buffer);
    logger.info("✅ Texto extraído exitosamente del PDF");
    return data.text;
  } catch (error) {
    logger.error("❌ Error al extraer texto del PDF", error);
    throw new Error(
      `Error extrayendo texto del PDF: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  logger.warn("⚠️ Procesando solicitud POST");

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

      const buffer = Buffer.from(await file.arrayBuffer());
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

  // Flujo normal de chat
  try {
    logger.warn("⚠️ Procesando solicitud de chat");
    const { messages, resource_id } = await req.json();
    logger.info("✅ Mensajes obtenidos del cuerpo de la solicitud");

    const lastUserMessage = messages[messages.length - 1].content;
    const relevantContent = await findRelevantContent(
      lastUserMessage,
      resource_id
    );

    const enhancedSystemPrompt = `
    # Role
    You are a context-aware assistant that provides accurate answers based strictly on retrieved knowledge.
    
    # Context
    ${relevantContent.map((x) => `• ${x.name}`).join("\n")}
    
    # Instructions
    1. FIRST analyze if the context contains relevant information for: "${lastUserMessage}" in same language
    2. IF RELEVANT INFORMATION EXISTS:
       - Synthesize a clear answer
       - Reference the context implicitly
    3. IF NO RELEVANT INFORMATION:
       - Respond using your base knowledge
    4. FOR AMBIGUOUS QUESTIONS:
       - Mention potential related content from context
       - Ask clarifying questions
    
    # Important
    Never invent information beyond what's in the context.
    `;

    const result = streamText({
      model: openai("gpt-4o"),
      system: enhancedSystemPrompt,
      temperature: 0.4,
      maxSteps: 5,
      messages,
    });

    logger.info("✅ Default mode processing completed");
    return result.toDataStreamResponse();
  } catch (error) {
    logger.error("❌ Error en el flujo de chat", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud de chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
