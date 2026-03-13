import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TrendingUp, MousePointerClick, Megaphone, Lightbulb, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

const platformColors: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  FACEBOOK: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  TWITTER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  LINKEDIN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  TIKTOK: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  APPROVED: "bg-green-100 text-green-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
}

async function getDashboardData(userId: string) {
  const [workspaces, recentPosts, analytics, pendingIdeas] = await Promise.all([
    prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      select: { id: true },
    }),
    prisma.post.findMany({
      where: { workspace: { members: { some: { userId } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { workspace: { select: { name: true } }, campaign: { select: { name: true } } },
    }),
    prisma.analytics.aggregate({
      where: { workspace: { members: { some: { userId } } } },
      _sum: { reach: true, clicks: true },
    }),
    prisma.idea.count({
      where: {
        workspace: { members: { some: { userId } } },
        status: { in: ["NEW", "IN_REVIEW"] },
      },
    }),
  ])

  const activeCampaigns = await prisma.campaign.count({
    where: {
      workspace: { members: { some: { userId } } },
      status: "ACTIVE",
    },
  })

  return {
    totalWorkspaces: workspaces.length,
    totalReach: analytics._sum.reach ?? 0,
    totalClicks: analytics._sum.clicks ?? 0,
    activeCampaigns,
    pendingIdeas,
    recentPosts,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) return null

  const userId = (session.user as any).id as string
  const data = await getDashboardData(userId)

  const metrics = [
    {
      title: "Total Reach",
      value: data.totalReach.toLocaleString(),
      icon: TrendingUp,
      description: "Across all platforms",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Total Clicks",
      value: data.totalClicks.toLocaleString(),
      icon: MousePointerClick,
      description: "Link clicks this period",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Active Campaigns",
      value: data.activeCampaigns.toString(),
      icon: Megaphone,
      description: "Currently running",
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Pending Ideas",
      value: data.pendingIdeas.toString(),
      icon: Lightbulb,
      description: "Awaiting review",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {session.user.name ?? session.user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/ideas" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Add Idea
          </Link>
          <Link href="/workspaces" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="w-4 h-4 mr-2" />
            New Workspace
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                    <p className="text-3xl font-bold mt-2">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${metric.bg}`}>
                    <Icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Recent Posts</CardTitle>
                <CardDescription>Latest content across all workspaces</CardDescription>
              </div>
              <Link href="/calendar" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-xs")}>
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No posts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first post to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="pl-6">Content</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentPosts.map((post) => (
                      <TableRow key={post.id} className="border-border/50">
                        <TableCell className="pl-6">
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">
                              {post.content.slice(0, 60)}
                              {post.content.length > 60 ? "…" : ""}
                            </p>
                            <p className="text-xs text-muted-foreground">{post.workspace.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${platformColors[post.platform] ?? ""}`}>
                            {post.platform}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[post.status] ?? ""}`}>
                            {post.status}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 text-xs text-muted-foreground">
                          {format(new Date(post.createdAt), "MMM d")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-border/50 h-full">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              <CardDescription>Shortcuts to common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Create Workspace", href: "/workspaces", icon: Plus },
                { label: "Schedule Post", href: "/calendar", icon: Megaphone },
                { label: "Submit Idea", href: "/ideas", icon: Lightbulb },
                { label: "View Analytics", href: "/analytics", icon: TrendingUp },
              ].map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start h-10")}
                  >
                    <Icon className="w-4 h-4 mr-3 text-muted-foreground" />
                    {action.label}
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
