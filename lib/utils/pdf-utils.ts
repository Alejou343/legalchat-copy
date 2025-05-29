import { parsePdf } from './pdf-parse-wrapper';

/**
 * Extracts text content from a PDF buffer using the parsePdf wrapper.
 *
 * @param {Buffer} buffer - The PDF file content as a buffer.
 * @returns {Promise<string>} - Resolves with extracted text from the PDF.
 * @throws {Error} Throws an error if text extraction fails.
 */

export const extractTextWithPdfParse = async (buffer: Buffer): Promise<string> => {
  try {
    return await parsePdf(buffer);
  } catch (error) {
    throw new Error(`Error extrayendo texto del PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
};