"use server";
import {
  NewResourceParams,
  insertResourceSchema,
  resources,
} from "@/lib/db/schema/resources";
import { db } from "../db";
import { generateEmbeddings } from "../ai/embedding";
import { embeddings as embeddingsTable } from "../db/schema/embeddings";
import logger from "../logger";

/**
 * Creates a new resource and generates embeddings for its content.
 *
 * - Validates the input using `insertResourceSchema`.
 * - Inserts the resource into the database with the associated user email.
 * - Generates embeddings for the resource content.
 * - Stores the embeddings linked to the resource and user email.
 *
 * @param {NewResourceParams} input - The input data for the new resource, including `content` and `user_email`.
 *
 * @returns {Promise<{ message: string; resource_id: string | null }>} An object with a success message and the created resource ID,
 * or an error message and `null` resource ID on failure.
 *
 * @example
 * const input = {
 *   content: "Example content",
 *   user_email: "user@example.com",
 * };
 * const result = await createResource(input);
 * console.log(result.message, result.resource_id);
 */

export const createResource = async (input: NewResourceParams) => {
  try {
    const { content, user_email } = insertResourceSchema.parse(input);

    // Insertar el recurso con userEmail
    const [resource] = await db
      .insert(resources)
      .values({
        content,
        user_email, // nombre exacto como en el schema
      })
      .returning();

    // Generar embeddings
    const embeddings = await generateEmbeddings(content);

    // Insertar los embeddings con user_email
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resource_id: resource.id,
        user_email, // también incluir aquí
        ...embedding,
      }))
    );

    return {
      message: "Resource successfully created and embedded.",
      resource_id: resource.id,
    };
  } catch (error) {
    logger.error(`Error creando recurso`);
    console.log(error);
    return {
      message: error || "Error creating resource",
      resource_id: null,
    };
  }
};
