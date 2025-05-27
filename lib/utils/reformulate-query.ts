import { MODEL_CONSTANTS } from "@/app/api/chat/constants/models";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // asegúrate de tener la variable definida
});

/**
 * Reformula una consulta de usuario para que coincida mejor con los embeddings del documento.
 */
export const rewriteUserQuery = async (
  originalQuery: string
): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_CONSTANTS.OPENAI.CHEAPEST,
      messages: [
        {
          role: "system",
          content: `
Eres un optimizador de consultas para búsqueda semántica en sistemas con embeddings.

Tu tarea es reformular la siguiente pregunta del usuario para que:
- Coincida con el lenguaje usado en documentos legales o migratorios.
- Sea concreta, informativa y contenga términos clave esperables en el texto.
- Aumente las probabilidades de coincidencia semántica con embeddings ya almacenados.

Reescribe la pregunta del usuario como una oración o frase que probablemente aparezca, o que refleje exactamente el tipo de información contenida en el documento.
Si la pregunta es muy general, genera una descripción concreta que represente el contenido completo del documento.

Responde solo con la consulta optimizada.
`
        },

        {
          role: "user",
          content: originalQuery,
        },
      ],
    });

    const reformulated =
      response.choices[0]?.message?.content?.trim() ?? originalQuery;
    return reformulated;
  } catch (error) {
    console.error("❌ Error al reformular la consulta:", error);
    return originalQuery;
  }
};
