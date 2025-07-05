import { AwsClient } from 'aws4fetch'

const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET = process.env.S3_BUCKET_NAME || ''

const aws = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  service: 's3',
  region: REGION,
})

export function getObjectUrl(key: string) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
}

export async function generatePresignedUploadUrl(key: string, contentType: string) {
  const url = getObjectUrl(key)
  const signedRequest = await aws.sign(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    aws: { signQuery: true },
  })
  return signedRequest.url
}

export async function fetchFileBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch file from S3: ${res.status} ${res.statusText}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
