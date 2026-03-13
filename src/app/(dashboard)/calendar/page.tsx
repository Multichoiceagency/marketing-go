import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ContentCalendar } from "@/components/dashboard/content-calendar"

async function getScheduledPosts(userId: string) {
  return prisma.post.findMany({
    where: {
      workspace: { members: { some: { userId } } },
      scheduledAt: { not: null },
    },
    include: {
      workspace: { select: { name: true } },
      campaign: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  })
}

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user) return null

  const userId = (session.user as any).id as string
  const posts = await getScheduledPosts(userId)

  const serializedPosts = posts.map((post) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    scheduledAt: post.scheduledAt?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    metrics: post.metrics as Record<string, unknown> | null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage all scheduled content across platforms
        </p>
      </div>
      <ContentCalendar posts={serializedPosts} />
    </div>
  )
}
