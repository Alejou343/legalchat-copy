import { NextRequest, NextResponse } from 'next/server'
import { generatePresignedUploadUrl, getObjectUrl } from '@/lib/utils/s3-utils'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { name, type } = await req.json()
    if (!name || !type) {
      return NextResponse.json({ error: 'Invalid file data' }, { status: 400 })
    }
    const key = `${randomUUID()}-${name}`
    const uploadUrl = await generatePresignedUploadUrl(key, type)
    const fileUrl = getObjectUrl(key)
    return NextResponse.json({ uploadUrl, fileUrl })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create upload url' }, { status: 500 })
  }
}
