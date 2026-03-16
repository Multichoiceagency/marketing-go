import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Building2, Users, ArrowRight, Globe } from "lucide-react"
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog"

async function getWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { name: true, email: true, image: true } } } },
      _count: { select: { campaigns: true, posts: true, ideas: true } },
    },
    orderBy: { updatedAt: "desc" },
  })
}

export default async function WorkspacesPage() {
  const session = await auth()
  if (!session?.user) return null

  const userId = session.user.id
  const workspaces = await getWorkspaces(userId)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your client workspaces and brand portals
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No workspaces yet</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Create your first workspace to start managing campaigns, content, and ideas for your clients.
          </p>
          <CreateWorkspaceDialog trigger={
            <Button className="mt-6">
              <Plus className="w-4 h-4 mr-2" />
              Create Workspace
            </Button>
          } />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="border-border/50 hover:border-border transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                      {workspace.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{workspace.name}</CardTitle>
                      {workspace.industry && (
                        <CardDescription className="text-xs">{workspace.industry}</CardDescription>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Campaigns", value: workspace._count.campaigns },
                    { label: "Posts", value: workspace._count.posts },
                    { label: "Ideas", value: workspace._count.ideas },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-muted/50 rounded-lg py-2">
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""}
                  </span>
                  {workspace.website && (
                    <>
                      <Globe className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {workspace.website.replace(/^https?:\/\//, "")}
                      </span>
                    </>
                  )}
                </div>

                <Link href={`/workspaces/${workspace.id}`} className={cn(buttonVariants({ variant: "outline" }), "w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors")}>
                  Open Portal
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
