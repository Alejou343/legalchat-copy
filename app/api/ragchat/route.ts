import { createResource } from "@/lib/actions/resources";
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { NextRequest } from "next/server";

export const maxDuration = 30;
export const runtime = "nodejs";

async function extractTextWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    const { default: pdfParse } = await import("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Error extrayendo texto del PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file || file.type !== "application/pdf") {
        return new Response(
          JSON.stringify({ error: "Archivo PDF inválido o faltante" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validar tamaño del archivo (opcional)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        return new Response(
          JSON.stringify({
            error: "El archivo PDF es demasiado grande (máximo 10MB)",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const content = await extractTextWithPdfParse(buffer);

      // Procesar el contenido (eliminar espacios múltiples, saltos de línea, etc.)
      const processedContent = content.replace(/\s+/g, " ").trim();

      await createResource({ content: processedContent });

      return new Response(
        JSON.stringify({
          message: "Documento procesado exitosamente",
          filename: file.name,
          contentLength: processedContent.length,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error procesando PDF:", error);
      return new Response(
        JSON.stringify({ error: "Error al procesar el documento PDF" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Flujo normal de chat
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai("gpt-4o"),
      system: `Eres un asistente especializado en analizar documentos PDF. 
               Responde basado en el conocimiento extraído de los documentos.`,
      messages,
      tools: {
        addResource: tool({
          description: "Agrega contenido a la base de conocimiento",
          parameters: z.object({
            content: z.string().describe("Texto a agregar"),
          }),
          execute: async ({ content }) => createResource({ content }),
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error en el chat:", error);
    return new Response(
      JSON.stringify({ error: "Error al procesar la solicitud de chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
