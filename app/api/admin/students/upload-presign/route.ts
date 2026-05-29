import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/auth"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

const REGION = process.env.AWS_REGION!
const BUCKET = process.env.AWS_BUCKET_NAME!
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

function getClient() {
  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })
}

/**
 * POST /api/admin/students/upload-presign
 *
 * Returns a presigned PUT URL for direct browser upload to the public S3 bucket,
 * plus the final public URL of the object.
 *
 * Body: { fileName: string, fileType: string, fileSize: number }
 * Response: { presignedUrl: string, publicUrl: string }
 */
export async function POST(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  if (!(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const body = await req.json()
  const { fileName, fileType, fileSize } = body

  if (!fileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 })
  if (!fileType) return NextResponse.json({ error: "fileType is required" }, { status: 400 })
  if (!fileSize || fileSize <= 0)
    return NextResponse.json({ error: "fileSize must be positive" }, { status: 400 })

  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: `File type '${fileType}' is not allowed. Accepted: JPEG, PNG, WEBP, PDF.` },
      { status: 400 },
    )
  }
  if (fileSize > MAX_BYTES) {
    return NextResponse.json({ error: "File size exceeds 5 MB limit." }, { status: 400 })
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "bin"
  const s3Key = `student-uploads/${uuidv4()}.${ext}`

  try {
    const client = getClient()
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: fileType,
    })
    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 5 * 60 })

    // Public URL (bucket must have a public-read policy applied via set-s3-public.ts)
    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`

    return NextResponse.json({ presignedUrl, publicUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate upload URL"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
