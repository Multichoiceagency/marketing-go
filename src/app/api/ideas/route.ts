export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  workspaceId: z.string().cuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  source: z.enum(["CLIENT", "AGENCY", "AI"]).default("CLIENT"),
  priority: z.number().int().min(0).max(10).default(0),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get("workspaceId")

  const where = workspaceId
    ? { workspaceId, workspace: { members: { some: { userId } } } }
    : { workspace: { members: { some: { userId } } } }

  const ideas = await prisma.idea.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(ideas)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string
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

  const idea = await prisma.idea.create({
    data: { ...data, workspaceId },
  })

  return NextResponse.json(idea, { status: 201 })
}
