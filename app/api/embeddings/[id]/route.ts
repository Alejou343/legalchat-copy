import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { deleteEmbeddingsByResourceId } from '@/lib/ai/deleteEmbeddings';

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
    logger.error('❌ Error deleting embeddings:', error);
    return NextResponse.json(
      { message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
