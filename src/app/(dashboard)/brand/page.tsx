import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Palette, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

async function getAllBrands(userId: string) {
  return prisma.brand.findMany({
    where: { workspace: { members: { some: { userId } } } },
    include: { workspace: { select: { name: true, id: true } } },
    orderBy: { updatedAt: "desc" },
  })
}

export default async function BrandCenterPage() {
  const session = await auth()
  if (!session?.user) return null

  const userId = (session.user as any).id as string
  const brands = await getAllBrands(userId)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage brand identities across all workspaces
        </p>
      </div>

      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
            <Palette className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No brands configured</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Open a workspace and configure its brand identity to get started.
          </p>
          <Link href="/workspaces" className={cn(buttonVariants(), "mt-6")}>Go to Workspaces</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{brand.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">{brand.workspace.name}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg border border-border"
                    style={{ backgroundColor: brand.primaryColor ?? "#6366f1" }}
                  />
                  <div
                    className="w-10 h-10 rounded-lg border border-border"
                    style={{ backgroundColor: brand.secondaryColor ?? "#a5b4fc" }}
                  />
                  <div className="ml-1">
                    <p className="text-xs text-muted-foreground">{brand.fontFamily ?? "System"}</p>
                    <p className="text-xs text-muted-foreground">{brand.ctaStyle ?? ""}</p>
                  </div>
                </div>

                {brand.toneOfVoice && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{brand.toneOfVoice}</p>
                )}

                {brand.forbiddenWords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {brand.forbiddenWords.slice(0, 3).map((word) => (
                      <Badge key={word} variant="destructive" className="text-xs">{word}</Badge>
                    ))}
                    {brand.forbiddenWords.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{brand.forbiddenWords.length - 3}</Badge>
                    )}
                  </div>
                )}

                <Link href={`/workspaces/${brand.workspace.id}/brand`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
                  Edit Brand
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
