import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { subDays, format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { AnalyticsFilters } from "@/components/dashboard/analytics-filters"
import { TrendingUp, Eye, MousePointerClick, Users } from "lucide-react"

async function getAnalytics(userId: string, days = 30) {
  const since = subDays(new Date(), days)

  const analytics = await prisma.analytics.findMany({
    where: {
      workspace: { members: { some: { userId } } },
      date: { gte: since },
    },
    orderBy: { date: "asc" },
  })

  return analytics
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; platform?: string }>
}) {
  const session = await auth()
  if (!session?.user) return null

  const { days: daysParam, platform: platformParam } = await searchParams
  const userId = (session.user as any).id as string
  const days = parseInt(daysParam ?? "30")

  let analytics = await getAnalytics(userId, days)

  if (platformParam && platformParam !== "all") {
    analytics = analytics.filter((a) => a.platform === platformParam)
  }

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

  const chartData = analytics.reduce(
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

  const chartArray = Object.values(chartData)

  const byPlatform = analytics.reduce(
    (acc: Record<string, { reach: number; clicks: number; impressions: number; leads: number }>, item) => {
      if (!acc[item.platform]) {
        acc[item.platform] = { reach: 0, clicks: 0, impressions: 0, leads: 0 }
      }
      acc[item.platform].reach += item.reach
      acc[item.platform].clicks += item.clicks
      acc[item.platform].impressions += item.impressions
      acc[item.platform].leads += item.leads
      return acc
    },
    {}
  )

  const summaryCards = [
    { label: "Total Reach", value: totals.reach, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Impressions", value: totals.impressions, icon: Eye, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Clicks", value: totals.clicks, icon: MousePointerClick, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "New Followers", value: totals.followers, icon: Users, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
  ]

  const platformColors: Record<string, string> = {
    INSTAGRAM: "bg-pink-100 text-pink-700",
    FACEBOOK: "bg-blue-100 text-blue-700",
    TWITTER: "bg-sky-100 text-sky-700",
    LINKEDIN: "bg-indigo-100 text-indigo-700",
    TIKTOK: "bg-slate-100 text-slate-700",
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Performance data across all platforms
          </p>
        </div>
        <AnalyticsFilters />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-2xl font-bold mt-1">{card.value.toLocaleString()}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartArray.length > 0 ? (
            <AnalyticsChart data={chartArray} />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No analytics data for this period. Connect your platforms to start tracking.
            </div>
          )}
        </CardContent>
      </Card>

      {Object.keys(byPlatform).length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Performance by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(byPlatform).map(([platform, stats]) => (
                <div key={platform} className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${platformColors[platform] ?? ""}`}>
                    {platform}
                  </span>
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    {[
                      { label: "Reach", value: stats.reach },
                      { label: "Impressions", value: stats.impressions },
                      { label: "Clicks", value: stats.clicks },
                      { label: "Leads", value: stats.leads },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-sm font-semibold">{s.value.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
