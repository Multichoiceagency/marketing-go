"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Platform = "INSTAGRAM" | "FACEBOOK" | "TWITTER" | "LINKEDIN" | "TIKTOK"

interface Post {
  id: string
  platform: Platform
  content: string
  status: string
  scheduledAt: string | null
  workspace: { name: string }
  campaign: { name: string } | null
}

interface ContentCalendarProps {
  posts: Post[]
}

const platformColors: Record<Platform, string> = {
  INSTAGRAM: "bg-pink-500",
  FACEBOOK: "bg-blue-600",
  TWITTER: "bg-sky-500",
  LINKEDIN: "bg-indigo-600",
  TIKTOK: "bg-slate-800",
}

const platformLabels: Record<Platform, string> = {
  INSTAGRAM: "IG",
  FACEBOOK: "FB",
  TWITTER: "TW",
  LINKEDIN: "LI",
  TIKTOK: "TK",
}

export function ContentCalendar({ posts }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [view, setView] = useState<"month" | "week">("month")

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getPostsForDay = (date: Date) =>
    posts.filter((post) => post.scheduledAt && isSameDay(new Date(post.scheduledAt), date))

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : []

  const paddingDays = new Array(monthStart.getDay()).fill(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {(["month", "week"] as const).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
              className="capitalize"
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {paddingDays.map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {days.map((day) => {
                  const dayPosts = getPostsForDay(day)
                  const isSelected = selectedDay && isSameDay(day, selectedDay)
                  const today = isToday(day)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "aspect-square p-1 rounded-lg text-left transition-colors hover:bg-accent",
                        isSelected && "bg-primary/10 ring-1 ring-primary",
                        today && "font-bold"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs flex items-center justify-center w-6 h-6 rounded-full",
                          today && "bg-primary text-primary-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {dayPosts.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayPosts.slice(0, 3).map((post) => (
                            <span
                              key={post.id}
                              className={`inline-block w-4 h-1.5 rounded-full ${platformColors[post.platform]}`}
                              title={`${post.platform}: ${post.content.slice(0, 50)}`}
                            />
                          ))}
                          {dayPosts.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 mt-3">
            {(Object.keys(platformColors) as Platform[]).map((platform) => (
              <div key={platform} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${platformColors[platform]}`} />
                <span className="text-xs text-muted-foreground">{platform}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <p className="text-sm font-semibold">
                {selectedDay ? format(selectedDay, "EEEE, MMMM d") : "Select a day"}
              </p>
              {selectedDay && (
                <p className="text-xs text-muted-foreground">
                  {selectedDayPosts.length} post{selectedDayPosts.length !== 1 ? "s" : ""} scheduled
                </p>
              )}
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {!selectedDay && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Click a date to see scheduled posts
                </p>
              )}
              {selectedDay && selectedDayPosts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No posts scheduled for this day
                </p>
              )}
              {selectedDayPosts.map((post) => (
                <div key={post.id} className="p-3 rounded-lg border border-border/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded text-white text-xs font-bold ${platformColors[post.platform]}`}
                    >
                      {platformLabels[post.platform]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{post.workspace.name}</p>
                      {post.scheduledAt && (
                        <p className="text-xs text-muted-foreground">{format(new Date(post.scheduledAt), "h:mm a")}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs line-clamp-2">{post.content}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {post.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
