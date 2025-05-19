import { promisify } from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Solución definitiva: Forzar modo producción y evitar auto-ejecución de tests
let originalEnv = 'production';

// @ts-ignore - Necesario para evitar el comportamiento de auto-prueba
const PdfParse = require('pdf-parse/lib/pdf-parse.js'); // Importación directa del parser

// Restaurar entorno original
originalEnv = "development";

export const parsePdf = async (buffer: Buffer) => {
  try {
    const data = await PdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
};