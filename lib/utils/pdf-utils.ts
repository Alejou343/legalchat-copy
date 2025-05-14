import logger from "@/lib/logger";

export async function extractTextWithPdfParse(buffer: Buffer): Promise<string> {
  try {
    logger.warn("⚠️ Extrayendo texto del PDF");
    const { default: pdfParse } = await import("pdf-parse");
    const data = await pdfParse(buffer);
    logger.info("✅ Texto extraído exitosamente del PDF");
    return data.text;
  } catch (error) {
    logger.error("❌ Error al extraer texto del PDF", error);
    throw new Error(`Error extrayendo texto del PDF: ${
      error instanceof Error ? error.message : String(error)
    }`);
  }
}
