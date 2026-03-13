export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["NEW", "IN_REVIEW", "APPROVED", "IN_PRODUCTION", "DONE", "REJECTED"]).optional(),
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(10).optional(),
  brief: z.record(z.string(), z.unknown()).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string

  const idea = await prisma.idea.findUnique({
    where: { id },
    include: { workspace: { include: { members: { where: { userId } } } } },
  })

  if (!idea || idea.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { brief, ...rest } = parsed.data
  const updated = await prisma.idea.update({
    where: { id },
    data: {
      ...rest,
      ...(brief !== undefined ? { brief: brief as any } : {}),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string

  const idea = await prisma.idea.findUnique({
    where: { id },
    include: { workspace: { include: { members: { where: { userId } } } } },
  })

  if (!idea || idea.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.idea.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
