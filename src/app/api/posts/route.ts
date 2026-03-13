export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  workspaceId: z.string().cuid(),
  campaignId: z.string().cuid().optional(),
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "TWITTER", "LINKEDIN", "TIKTOK"]),
  content: z.string().min(1),
  mediaUrls: z.array(z.string().url()).default([]),
  scheduledAt: z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get("workspaceId")
  const status = searchParams.get("status")
  const platform = searchParams.get("platform")

  const where: Record<string, unknown> = {
    workspace: { members: { some: { userId } } },
  }

  if (workspaceId) where.workspaceId = workspaceId
  if (status) where.status = status
  if (platform) where.platform = platform

  const posts = await prisma.post.findMany({
    where,
    include: {
      workspace: { select: { name: true } },
      campaign: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const body = await req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { workspaceId, ...data } = parsed.data

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })

  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const post = await prisma.post.create({
    data: {
      ...data,
      workspaceId,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
    },
  })

  return NextResponse.json(post, { status: 201 })
}
