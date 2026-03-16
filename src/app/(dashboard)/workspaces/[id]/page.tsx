import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { BarChart3, Lightbulb, Palette, Calendar, Plus, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { IdeasKanban } from "@/components/dashboard/ideas-kanban"
import { format, subDays } from "date-fns"

async function getWorkspace(id: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id, members: { some: { userId } } },
    include: {
      brands: { take: 1 },
      posts: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { campaign: { select: { name: true } } },
      },
      ideas: { orderBy: { createdAt: "desc" } },
      analytics: {
        where: { date: { gte: subDays(new Date(), 30) } },
        orderBy: { date: "asc" },
      },
      _count: { select: { campaigns: true, posts: true, ideas: true } },
    },
  })
  return workspace
}

const platformColors: Record<string, string> = {
  INSTAGRAM: "bg-pink-100 text-pink-700",
  FACEBOOK: "bg-blue-100 text-blue-700",
  TWITTER: "bg-sky-100 text-sky-700",
  LINKEDIN: "bg-indigo-100 text-indigo-700",
  TIKTOK: "bg-slate-100 text-slate-700",
}

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return null

  const userId = session.user.id
  const workspace = await getWorkspace(id, userId)

  if (!workspace) notFound()

  const brand = workspace.brands[0]

  const analyticsData = workspace.analytics.reduce(
    (acc: Record<string, { date: string; reach: number; clicks: number; impressions: number }>, item) => {
      const dateKey = format(new Date(item.date), "MMM d")
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, reach: 0, clicks: 0, impressions: 0 }
      }
      acc[dateKey].reach += item.reach
      acc[dateKey].clicks += item.clicks
      acc[dateKey].impressions += item.impressions
      return acc
    },
    {}
  )

  const chartData = Object.values(analyticsData)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{workspace.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{workspace.industry ?? "Client Portal"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/workspaces/${id}/ideas`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Ideas Board
          </Link>
          <Link href={`/workspaces/${id}/brand`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Palette className="w-4 h-4 mr-2" />
            Brand Center
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Campaigns", value: workspace._count.campaigns, icon: TrendingUp },
          { label: "Posts", value: workspace._count.posts, icon: Calendar },
          { label: "Ideas", value: workspace._count.ideas, icon: Lightbulb },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-border/50">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="posts">
            <Calendar className="w-4 h-4 mr-2" />
            Top Posts
          </TabsTrigger>
          <TabsTrigger value="ideas">
            <Lightbulb className="w-4 h-4 mr-2" />
            Ideas Board
          </TabsTrigger>
          <TabsTrigger value="brand">
            <Palette className="w-4 h-4 mr-2" />
            Brand Center
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Reach Over Last 30 Days</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <AnalyticsChart data={chartData} />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  No analytics data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="mt-6">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Posts</CardTitle>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Post
              </Button>
            </CardHeader>
            <CardContent>
              {workspace.posts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No posts yet</p>
              ) : (
                <div className="space-y-3">
                  {workspace.posts.map((post) => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium shrink-0 ${platformColors[post.platform] ?? ""}`}>
                        {post.platform}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{post.content}</p>
                        {post.campaign && (
                          <p className="text-xs text-muted-foreground mt-0.5">{post.campaign.name}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{post.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas" className="mt-6">
          <IdeasKanban ideas={workspace.ideas} workspaceId={id} />
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Brand Identity</CardTitle>
              <Link href={`/workspaces/${id}/brand`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Edit Brand</Link>
            </CardHeader>
            <CardContent>
              {!brand ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No brand configured yet</p>
                  <Link href={`/workspaces/${id}/brand`} className={cn(buttonVariants({ size: "sm" }), "mt-3")}>Set Up Brand</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl border border-border"
                      style={{ backgroundColor: brand.primaryColor ?? "#6366f1" }}
                    />
                    <div
                      className="w-12 h-12 rounded-xl border border-border"
                      style={{ backgroundColor: brand.secondaryColor ?? "#a5b4fc" }}
                    />
                    <div className="ml-2">
                      <p className="text-sm font-medium">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">{brand.fontFamily ?? "System font"}</p>
                    </div>
                  </div>
                  {brand.toneOfVoice && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tone of Voice</p>
                      <p className="text-sm">{brand.toneOfVoice}</p>
                    </div>
                  )}
                  {brand.forbiddenWords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Forbidden Words</p>
                      <div className="flex flex-wrap gap-1.5">
                        {brand.forbiddenWords.map((word) => (
                          <Badge key={word} variant="destructive" className="text-xs">{word}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
