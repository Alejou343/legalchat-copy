import logger from "@/lib/logger"; // Asegúrate de tener tu logger importado
import { createResource } from "@/lib/actions/resources";
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { NextRequest } from "next/server";
import { findRelevantContent } from "@/lib/ai/embedding";

export const maxDuration = 30;
export const runtime = "nodejs";

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
      const { resourceId } = resourceResponse;
      logger.info("✅ Recurso creado en la base de conocimiento");

      return new Response(
        JSON.stringify({
          message: "Documento procesado exitosamente",
          filename: file.name,
          contentLength: processedContent.length,
          resourceId: resourceId,
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
    const { messages, resourceId } = await req.json();
    logger.info("✅ Mensajes obtenidos del cuerpo de la solicitud");

    const result = streamText({
      model: openai("gpt-4o"),
      system: `You're an AI assistant that helps users find information in their knowledge base. You can answer questions based on the content provided.`,
      temperature: 0.2,
      messages,
      tools: {
        getInformation: tool({
          description: `get information from your knowledge base to answer questions.`,
          parameters: z.object({
            question: z.string().describe("the users question"),
          }),
          execute: async ({ question }) => await findRelevantContent(question, resourceId),
        }),
      },
    });

    logger.info("✅ Flujo de chat iniciado con éxito");
    return result.toDataStreamResponse();
  } catch (error) {
    logger.error("❌ Error en el flujo de chat", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud de chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
