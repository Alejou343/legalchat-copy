import { createResource } from "@/lib/actions/resources";
import logger from "@/lib/logger";
import { extractTextWithPdfParse } from "@/lib/utils/pdf-utils";

export async function handlePdfUpload(data: {
  file: {
    name: string;
    type: string;
    content: string;
  };
}, email: string) {
  try {
    const { file } = data;

    logger.warn("⚠️ Recibido archivo PDF desde JSON base64");

    if (
      !file ||
      file.type !== "application/pdf" ||
      typeof file.content !== "string"
    ) {
      logger.error("❌ Archivo PDF inválido o faltante");
      return jsonResponse({ error: "Archivo PDF inválido o faltante" }, 400);
    }

    const base64Data = file.content.split(",")[1]; // elimina "data:application/pdf;base64,"
    const buffer = Buffer.from(base64Data, "base64");

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (buffer.length > MAX_SIZE) {
      logger.error("❌ Archivo PDF excede tamaño permitido (10MB)");
      return jsonResponse({
        error: "El archivo PDF es demasiado grande (máximo 10MB)",
      }, 400);
    }

    const content = await extractTextWithPdfParse(buffer);
    const processedContent = content.replace(/\s+/g, " ").trim();

    logger.info("✅ Texto del PDF procesado correctamente");

    const { resource_id } = await createResource({ content: processedContent, user_email: email });
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
