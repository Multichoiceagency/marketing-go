import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { IdeasKanban } from "@/components/dashboard/ideas-kanban"
import { CreateIdeaDialog } from "@/components/dashboard/create-idea-dialog"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

async function getWorkspaceIdeas(id: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id, members: { some: { userId } } },
    include: { ideas: { orderBy: [{ priority: "desc" }, { createdAt: "desc" }] } },
  })
  return workspace
}

export default async function IdeasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return null

  const userId = session.user.id
  const workspace = await getWorkspaceIdeas(id, userId)

  if (!workspace) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/workspaces/${id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ideas Board</h1>
            <p className="text-muted-foreground text-sm mt-1">{workspace.name}</p>
          </div>
        </div>
        <CreateIdeaDialog workspaceId={id} />
      </div>

      <IdeasKanban ideas={workspace.ideas} workspaceId={id} />
    </div>
  )
}
