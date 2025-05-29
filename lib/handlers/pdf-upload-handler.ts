import { createResource } from "@/lib/actions/resources";
import logger from "@/lib/logger";
import { extractTextWithPdfParse } from "@/lib/utils/pdf-utils";

/**
 * Handles uploading and processing a PDF file encoded as base64 JSON,
 * extracting text content, validating file size and type, and creating a resource record.
 *
 * @param {object} data - The input data containing the file info.
 * @param {{ name: string; type: string; content: string }} data.file - PDF file metadata and base64 content.
 * @param {string} email - The email of the user uploading the PDF.
 * @returns {Promise<Response>} - JSON response indicating success or error details.
 *
 * Validations:
 * - Ensures the file is present and is a PDF type.
 * - Checks that the base64 content is a string.
 * - Limits file size to 10MB.
 *
 * Process:
 * - Extracts text from the PDF buffer.
 * - Cleans up extracted text.
 * - Creates a resource with the extracted content and user email.
 */

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

/**
 * Helper function to build a JSON Response with given body and status code.
 *
 * @param {object} body - The response body object to be JSON-stringified.
 * @param {number} [status=200] - HTTP status code of the response.
 * @returns {Response} - A new Response object with JSON body and proper headers.
 */

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
