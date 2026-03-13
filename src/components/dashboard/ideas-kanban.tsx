"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Lightbulb, CheckCircle2, XCircle, Zap } from "lucide-react"
import { format } from "date-fns"

type IdeaStatus = "NEW" | "IN_REVIEW" | "APPROVED" | "IN_PRODUCTION" | "DONE" | "REJECTED"
type IdeaSource = "CLIENT" | "AGENCY" | "AI"

interface Idea {
  id: string
  title: string
  description: string | null
  status: IdeaStatus
  source: IdeaSource
  priority: number
  createdAt: Date
}

interface IdeasKanbanProps {
  ideas: Idea[]
  workspaceId: string
}

const columns: { key: IdeaStatus; label: string; icon: typeof Lightbulb; color: string }[] = [
  { key: "NEW", label: "New", icon: Lightbulb, color: "text-amber-500" },
  { key: "IN_REVIEW", label: "In Review", icon: Clock, color: "text-blue-500" },
  { key: "APPROVED", label: "Approved", icon: CheckCircle2, color: "text-green-500" },
  { key: "DONE", label: "Done", icon: Zap, color: "text-purple-500" },
]

const sourceColors: Record<IdeaSource, string> = {
  CLIENT: "bg-blue-100 text-blue-700",
  AGENCY: "bg-purple-100 text-purple-700",
  AI: "bg-emerald-100 text-emerald-700",
}

export function IdeasKanban({ ideas }: IdeasKanbanProps) {
  const [localIdeas, setLocalIdeas] = useState(ideas)

  const moveIdea = async (ideaId: string, newStatus: IdeaStatus) => {
    setLocalIdeas((prev) =>
      prev.map((idea) => (idea.id === ideaId ? { ...idea, status: newStatus } : idea))
    )

    await fetch(`/api/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {columns.map((column) => {
        const Icon = column.icon
        const columnIdeas = localIdeas.filter((idea) => idea.status === column.key)

        return (
          <div key={column.key} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Icon className={`w-4 h-4 ${column.color}`} />
              <span className="text-sm font-medium">{column.label}</span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {columnIdeas.length}
              </span>
            </div>

            <div className="space-y-2 min-h-[100px]">
              {columnIdeas.map((idea) => (
                <Card key={idea.id} className="border-border/50 hover:shadow-sm transition-shadow">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-sm font-medium leading-snug">{idea.title}</p>
                    {idea.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{idea.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sourceColors[idea.source]}`}>
                        {idea.source}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(idea.createdAt), "MMM d")}
                      </span>
                    </div>

                    {column.key !== "DONE" && column.key !== "REJECTED" && (
                      <div className="flex gap-1 pt-1">
                        {column.key === "NEW" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs flex-1"
                            onClick={() => moveIdea(idea.id, "IN_REVIEW")}
                          >
                            Review
                          </Button>
                        )}
                        {column.key === "IN_REVIEW" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs flex-1"
                              onClick={() => moveIdea(idea.id, "APPROVED")}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-destructive hover:text-destructive"
                              onClick={() => moveIdea(idea.id, "REJECTED")}
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {column.key === "APPROVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs flex-1"
                            onClick={() => moveIdea(idea.id, "IN_PRODUCTION")}
                          >
                            Produce
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {columnIdeas.length === 0 && (
                <div className="flex items-center justify-center h-20 border-2 border-dashed border-border/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">No ideas</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
