"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus } from "lucide-react"

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  source: z.enum(["CLIENT", "AGENCY", "AI"]),
})

type FormData = z.infer<typeof schema>

interface CreateIdeaDialogProps {
  workspaceId: string
}

export function CreateIdeaDialog({ workspaceId }: CreateIdeaDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: "CLIENT" },
  })

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, workspaceId }),
    })

    if (res.ok) {
      setOpen(false)
      reset()
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="w-4 h-4 mr-2" />
        Add Idea
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Idea</DialogTitle>
          <DialogDescription>Add a new content idea to the board.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input placeholder="Campaign idea title..." {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe the idea in detail..."
              className="resize-none"
              rows={3}
              {...register("description")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Source</label>
            <Select
              defaultValue="CLIENT"
              onValueChange={(v) => { if (v) setValue("source", v as "CLIENT" | "AGENCY" | "AI") }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT">Client</SelectItem>
                <SelectItem value="AGENCY">Agency</SelectItem>
                <SelectItem value="AI">AI Generated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Idea
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
