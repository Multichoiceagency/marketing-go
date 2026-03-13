import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { BrandEditor } from "@/components/dashboard/brand-editor"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

async function getWorkspaceBrand(id: string, userId: string) {
  const workspace = await prisma.workspace.findFirst({
    where: { id, members: { some: { userId } } },
    include: { brands: { take: 1 } },
  })
  return workspace
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return null

  const userId = (session.user as any).id as string
  const workspace = await getWorkspaceBrand(id, userId)

  if (!workspace) notFound()

  const brand = workspace.brands[0] ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/workspaces/${id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Center</h1>
          <p className="text-muted-foreground text-sm mt-1">{workspace.name}</p>
        </div>
      </div>

      <BrandEditor workspaceId={id} brand={brand} />
    </div>
  )
}
