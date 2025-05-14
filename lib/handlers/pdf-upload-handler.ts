import { createResource } from "@/lib/actions/resources";
import logger from "@/lib/logger";
import { extractTextWithPdfParse } from "@/lib/utils/pdf-utils";
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
      return jsonResponse({
        error: "El archivo PDF es demasiado grande (máximo 10MB)",
      }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const content = await extractTextWithPdfParse(buffer);
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
    return jsonResponse({ error: "Error al procesar el documento PDF" }, 500);
  }
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
