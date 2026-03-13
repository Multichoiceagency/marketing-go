import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { IdeasKanban } from "@/components/dashboard/ideas-kanban"
import { CreateIdeaDialog } from "@/components/dashboard/create-idea-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

async function getAllIdeas(userId: string) {
  const [ideas, workspaces] = await Promise.all([
    prisma.idea.findMany({
      where: { workspace: { members: { some: { userId } } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      select: { id: true, name: true },
    }),
  ])
  return { ideas, workspaces }
}

export default async function IdeasPage() {
  const session = await auth()
  if (!session?.user) return null

  const userId = (session.user as any).id as string
  const { ideas, workspaces } = await getAllIdeas(userId)

  const firstWorkspace = workspaces[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ideas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All content ideas across your workspaces
          </p>
        </div>
        {firstWorkspace && <CreateIdeaDialog workspaceId={firstWorkspace.id} />}
      </div>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">No ideas yet. Submit your first idea!</p>
        </div>
      ) : (
        <IdeasKanban
          ideas={ideas}
          workspaceId={firstWorkspace?.id ?? ""}
        />
      )}
    </div>
  )
}
