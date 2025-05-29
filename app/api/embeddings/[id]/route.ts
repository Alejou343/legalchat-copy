import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { deleteEmbeddingsByResourceId } from "@/lib/ai/deleteEmbeddings";

/**
 * Handles DELETE requests to remove embeddings associated with a given resource ID.
 *
 * @param {NextRequest} request - The incoming Next.js request object.
 * @param {{ params: { id: string } }} context - The route context containing path parameters.
 * @param {string} context.params.id - The ID of the resource whose embeddings should be deleted.
 *
 * @returns {Promise<NextResponse>} JSON response indicating the number of deleted embeddings or an error.
 *
 * @example
 * // DELETE /api/embeddings/:id
 * export async function DELETE(request, { params }) {
 *   // ...function logic
 * }
 */

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const deletedCount = await deleteEmbeddingsByResourceId(id);

    logger.info(`✅ Deleted ${deletedCount} embeddings for id: ${id}`);
    return NextResponse.json(
      { message: `${deletedCount} embeddings deleted.` },
      { status: 200 }
    );
  } catch (error) {
    logger.error("❌ Error deleting embeddings:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
