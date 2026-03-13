export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  logo: z.string().optional(),
})

async function checkAccess(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
  return member
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const workspace = await prisma.workspace.findFirst({
    where: { id, members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { name: true, email: true, image: true } } } },
      brands: true,
      _count: { select: { campaigns: true, posts: true, ideas: true } },
    },
  })

  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(workspace)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const member = await checkAccess(id, userId)

  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const workspace = await prisma.workspace.update({
    where: { id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.website !== undefined && { website: parsed.data.website || null }),
      ...(parsed.data.industry !== undefined && { industry: parsed.data.industry }),
      ...(parsed.data.logo !== undefined && { logo: parsed.data.logo }),
    },
  })

  return NextResponse.json(workspace)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const member = await checkAccess(id, userId)

  if (!member || member.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.workspace.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
