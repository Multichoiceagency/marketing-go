export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getPresignedUploadUrl } from "@/lib/s3"
import { z } from "zod"
import { randomUUID } from "crypto"

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^[\w\-]+\/[\w\-+.]+$/, "Invalid content type"),
  workspaceId: z.string().cuid(),
})

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/mov",
  "video/quicktime",
  "application/pdf",
]

const MAX_SIZE_BYTES = 100 * 1024 * 1024 // 100MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { filename, contentType, workspaceId } = parsed.data

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `File type not allowed. Allowed types: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  // Sanitize filename to prevent path traversal
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const ext = safeName.split(".").pop() ?? "bin"
  const key = `workspaces/${workspaceId}/uploads/${randomUUID()}.${ext}`

  try {
    const uploadUrl = await getPresignedUploadUrl(key, contentType)
    const publicUrl = `${process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      expiresIn: 3600,
    })
  } catch (err) {
    console.error("S3 presigned URL error:", err)
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 })
  }
}
