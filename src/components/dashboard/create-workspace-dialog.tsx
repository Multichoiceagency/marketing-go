"use client"

import { useState, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus } from "lucide-react"

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  website: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  industry: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CreateWorkspaceDialogProps {
  trigger?: ReactNode
}

export function CreateWorkspaceDialog({ trigger }: CreateWorkspaceDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      const workspace = await res.json()
      setOpen(false)
      reset()
      router.push(`/workspaces/${workspace.id}`)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)} style={{ display: "contents" }}>
          {trigger}
        </span>
      ) : (
        <DialogTrigger render={<Button size="sm" />}>
          <Plus className="w-4 h-4 mr-2" />
          New Workspace
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Set up a new client workspace to manage their marketing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace Name *</label>
            <Input placeholder="Acme Corp" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Website</label>
            <Input placeholder="https://acme.com" {...register("website")} />
            {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <Input placeholder="E-commerce, SaaS, Retail..." {...register("industry")} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Workspace
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
