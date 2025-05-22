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
