export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(2),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const workspaces = await prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { campaigns: true, posts: true, ideas: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(workspaces)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const body = await req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, website, industry } = parsed.data

  let slug = slugify(name)
  const existing = await prisma.workspace.findUnique({ where: { slug } })
  if (existing) {
    slug = `${slug}-${Date.now()}`
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      website: website || null,
      industry: industry || null,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
    },
  })

  return NextResponse.json(workspace, { status: 201 })
}
