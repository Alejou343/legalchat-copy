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
    const { content } = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({ content })
      .returning();

    const embeddings = await generateEmbeddings(content);
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resource_id: resource.id,
        ...embedding,
      }))
    );

    return {
      message: "Resource successfully created and embedded.",
      resource_id: resource.id,
    };
} catch (error) {
    logger.error(`Error creando recurso`)
    console.log(error)
    return {
      message: error || 'Error creating resource',
      resource_id: null,
    };
  }
};
