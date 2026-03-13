import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) return null

  const user = session.user
  const role = (user as any).role as string

  const initials = user.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? "U"

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account preferences</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user.name ?? "No name set"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs">{role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>Connected services and APIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "PostgreSQL", description: "Primary database", status: "connected" },
              { name: "Redis / BullMQ", description: "Job queues and caching", status: "connected" },
              { name: "MinIO / S3", description: "Media storage", status: "configured" },
              { name: "Temporal", description: "Workflow orchestration", status: "configured" },
              { name: "n8n", description: "Automation workflows", status: "not configured" },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
                <Badge
                  variant={integration.status === "connected" ? "default" : integration.status === "configured" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {integration.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
          <CardDescription>Runtime configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: "DATABASE_URL", label: "Database URL" },
              { key: "AUTH_SECRET", label: "Auth Secret" },
              { key: "REDIS_URL", label: "Redis URL" },
              { key: "S3_ENDPOINT", label: "S3 Endpoint" },
            ].map((env) => (
              <div key={env.key} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-muted-foreground">{env.key}</span>
                <Badge
                  variant={process.env[env.key] ? "default" : "destructive"}
                  className="text-xs"
                >
                  {process.env[env.key] ? "Set" : "Missing"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
