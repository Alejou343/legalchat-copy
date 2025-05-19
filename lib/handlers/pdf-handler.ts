import { createResource } from "@/lib/actions/resources";
import logger from "@/lib/logger";
import { parsePdf } from "@/lib/utils/pdf-parse-wrapper";
import type { NextRequest } from "next/server";

export async function handlePdfUpload(req: NextRequest) {
  try {
    logger.warn("⚠️ Detectado archivo PDF en multipart/form-data");
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      logger.error("❌ Archivo PDF inválido o faltante");
      return jsonResponse({ error: "Archivo PDF inválido o faltante" }, 400);
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      logger.error("❌ Archivo PDF excede tamaño permitido (10MB)");
      return jsonResponse(
        {
          error: "El archivo PDF es demasiado grande (máximo 10MB)",
        },
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    logger.warn("⚠️ Extrayendo texto del PDF");
    const content = await parsePdf(buffer); // Usamos el wrapper seguro
    const processedContent = content.replace(/\s+/g, " ").trim();

    logger.info("✅ Texto del PDF procesado correctamente");

    const { resource_id } = await createResource({ content: processedContent });
    logger.info("✅ Recurso creado en la base de conocimiento");

    return jsonResponse({
      message: "Documento procesado exitosamente",
      filename: file.name,
      contentLength: processedContent.length,
      resource_id,
    });
  } catch (error) {
    logger.error("❌ Error procesando archivo PDF", error);
    return jsonResponse(
      { 
        error: "Error al procesar el documento PDF",
        details: error instanceof Error ? error.message : String(error)
      }, 
      500
    );
  }
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}