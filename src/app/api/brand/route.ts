export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  workspaceId: z.string().cuid(),
  name: z.string().min(1),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  toneOfVoice: z.string().optional(),
  forbiddenWords: z.array(z.string()).default([]),
  ctaStyle: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  guidelines: z.string().optional(),
})

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

  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const brand = await prisma.brand.create({
    data: {
      ...data,
      workspaceId,
      websiteUrl: data.websiteUrl || null,
    },
  })

  return NextResponse.json(brand, { status: 201 })
}
