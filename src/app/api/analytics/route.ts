export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { subDays, parseISO } from "date-fns"
import { z } from "zod"

const querySchema = z.object({
  workspaceId: z.string().cuid().optional(),
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "TWITTER", "LINKEDIN", "TIKTOK"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const { searchParams } = new URL(req.url)

  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { workspaceId, platform, from, to, days } = parsed.data

  const startDate = from ? parseISO(from) : subDays(new Date(), days)
  const endDate = to ? parseISO(to) : new Date()

  const where: Record<string, unknown> = {
    workspace: { members: { some: { userId } } },
    date: { gte: startDate, lte: endDate },
  }

  if (workspaceId) where.workspaceId = workspaceId
  if (platform) where.platform = platform

  const analytics = await prisma.analytics.findMany({
    where,
    orderBy: { date: "asc" },
    include: { workspace: { select: { name: true } } },
  })

  const totals = analytics.reduce(
    (acc, item) => ({
      reach: acc.reach + item.reach,
      impressions: acc.impressions + item.impressions,
      clicks: acc.clicks + item.clicks,
      leads: acc.leads + item.leads,
      followers: acc.followers + item.followers,
    }),
    { reach: 0, impressions: 0, clicks: 0, leads: 0, followers: 0 }
  )

  return NextResponse.json({ data: analytics, totals })
}
