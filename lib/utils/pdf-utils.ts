// lib/utils/pdf-utils.ts
import { parsePdf } from './pdf-parse-wrapper';

export const extractTextWithPdfParse = async (buffer: Buffer): Promise<string> => {
  try {
    return await parsePdf(buffer);
  } catch (error) {
    throw new Error(`Error extrayendo texto del PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
};