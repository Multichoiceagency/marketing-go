export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  toneOfVoice: z.string().optional(),
  forbiddenWords: z.array(z.string()).optional(),
  ctaStyle: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  guidelines: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id as string

  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { workspace: { include: { members: { where: { userId } } } } },
  })

  if (!brand || brand.workspace.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (brand.workspace.members[0].role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.brand.update({
    where: { id },
    data: {
      ...parsed.data,
      websiteUrl: parsed.data.websiteUrl || null,
    },
  })

  return NextResponse.json(updated)
}
