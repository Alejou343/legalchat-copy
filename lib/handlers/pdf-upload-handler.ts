import { createResource } from "@/lib/actions/resources";
import logger from "@/lib/logger";
import { extractTextWithPdfParse } from "@/lib/utils/pdf-utils";
import { CoreMessage, CoreUserMessage } from "ai";

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

export async function handlePdfUpload(
  messages: CoreMessage[],
  data: {
    file: {
      name: string
      type: string
      content: string
    }
  },
  email: string
): Promise<{ messages: CoreMessage[]; resource_id: string | null }> {
  const { file } = data

  logger.warn('⚠️ Recibido archivo PDF desde JSON base64')

  // 1️⃣ Validaciones
  if (
    !file ||
    file.type !== 'application/pdf' ||
    typeof file.content !== 'string'
  ) {
    logger.error('❌ Archivo PDF inválido o faltante')
    throw new Error('Archivo PDF inválido o faltante')
  }

  // 2️⃣ Decodificar y limitar tamaño
  const base64Data = file.content.split(',')[1]
  const buffer = Buffer.from(base64Data, 'base64')
  const MAX_SIZE = 20 * 1024 * 1024 // 20MB
  if (buffer.length > MAX_SIZE) {
    logger.error('❌ Archivo PDF excede tamaño permitido (20MB)')
    throw new Error('El archivo PDF es demasiado grande (máximo 20MB)')
  }

  // 3️⃣ Extraer texto plano
  const rawText = await extractTextWithPdfParse(buffer)
  const processedContent = rawText.replace(/\s+/g, ' ').trim()
  logger.info('✅ Texto del PDF procesado correctamente')

  // 4️⃣ Crear recurso en tu KB
  const { resource_id } = await createResource({
    content: processedContent,
    user_email: email
  })
  logger.info('✅ Recurso creado en la base de conocimiento', resource_id)

  // 5️⃣ Construir mensaje de usuario con el fichero
  const fileMessage: CoreUserMessage = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: `He subido un PDF llamado **${file.name}** (longitud de texto: ${processedContent.length} caracteres).`
      }
    ]
  }

  // 6️⃣ Devolver un nuevo array de mensajes y el id del recurso
  return { messages: [...messages, fileMessage], resource_id }
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
