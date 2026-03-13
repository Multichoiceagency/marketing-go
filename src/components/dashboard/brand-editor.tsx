"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Globe, X, Plus } from "lucide-react"

const schema = z.object({
  name: z.string().min(1, "Brand name is required"),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
  toneOfVoice: z.string().optional(),
  ctaStyle: z.string().optional(),
  websiteUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  guidelines: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Brand {
  id: string
  name: string
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  toneOfVoice: string | null
  forbiddenWords: string[]
  ctaStyle: string | null
  websiteUrl: string | null
  guidelines: string | null
}

interface BrandEditorProps {
  workspaceId: string
  brand: Brand | null
}

const fontOptions = ["Inter", "Roboto", "Poppins", "Playfair Display", "Montserrat", "Lato", "Open Sans"]
const ctaOptions = ["Action-oriented", "Conversational", "Formal", "Playful", "Urgent", "Minimalist"]
const toneOptions = [
  "Professional & Authoritative",
  "Friendly & Conversational",
  "Inspirational & Motivating",
  "Educational & Informative",
  "Playful & Humorous",
  "Empathetic & Supportive",
]

export function BrandEditor({ workspaceId, brand }: BrandEditorProps) {
  const router = useRouter()
  const [forbiddenWords, setForbiddenWords] = useState<string[]>(brand?.forbiddenWords ?? [])
  const [wordInput, setWordInput] = useState("")
  const [scraping, setScraping] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: brand?.name ?? "",
      primaryColor: brand?.primaryColor ?? "#6366f1",
      secondaryColor: brand?.secondaryColor ?? "#a5b4fc",
      fontFamily: brand?.fontFamily ?? "Inter",
      toneOfVoice: brand?.toneOfVoice ?? "",
      ctaStyle: brand?.ctaStyle ?? "Action-oriented",
      websiteUrl: brand?.websiteUrl ?? "",
      guidelines: brand?.guidelines ?? "",
    },
  })

  const primaryColor = watch("primaryColor")
  const secondaryColor = watch("secondaryColor")
  const websiteUrl = watch("websiteUrl")

  const addForbiddenWord = () => {
    const word = wordInput.trim()
    if (word && !forbiddenWords.includes(word)) {
      setForbiddenWords((prev) => [...prev, word])
      setWordInput("")
    }
  }

  const removeForbiddenWord = (word: string) => {
    setForbiddenWords((prev) => prev.filter((w) => w !== word))
  }

  const handleScrape = async () => {
    if (!websiteUrl) return
    setScraping(true)
    try {
      const res = await fetch("/api/brand/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.primaryColor) setValue("primaryColor", data.primaryColor)
        if (data.fontFamily) setValue("fontFamily", data.fontFamily)
      }
    } finally {
      setScraping(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    const method = brand ? "PATCH" : "POST"

    const payload = { ...data, forbiddenWords, workspaceId, brandId: brand?.id }

    const endpoint = brand
      ? `/api/brand/${brand.id}`
      : `/api/brand`

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Brand Identity</CardTitle>
            <CardDescription>Core brand information and visual identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Brand Name *</label>
              <Input placeholder="Your Brand" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 rounded-lg border border-border cursor-pointer"
                    {...register("primaryColor")}
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setValue("primaryColor", e.target.value)}
                    className="font-mono text-sm"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 rounded-lg border border-border cursor-pointer"
                    {...register("secondaryColor")}
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setValue("secondaryColor", e.target.value)}
                    className="font-mono text-sm"
                    placeholder="#a5b4fc"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Font Family</label>
              <Select
                defaultValue={brand?.fontFamily ?? "Inter"}
                onValueChange={(v) => { if (v) setValue("fontFamily", v) }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((font) => (
                    <SelectItem key={font} value={font}>{font}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Website</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://yourbrand.com"
                  {...register("websiteUrl")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleScrape}
                  disabled={scraping || !websiteUrl}
                  title="Scrape brand colors from website"
                >
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                </Button>
              </div>
              {errors.websiteUrl && (
                <p className="text-xs text-destructive">{errors.websiteUrl.message}</p>
              )}
              {scraping && (
                <p className="text-xs text-muted-foreground">Extracting brand colors from website...</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Voice & Style</CardTitle>
            <CardDescription>Define how the brand communicates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tone of Voice</label>
              <Select
                defaultValue={brand?.toneOfVoice ?? toneOptions[0]}
                onValueChange={(v) => { if (v) setValue("toneOfVoice", v) }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone..." />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((tone) => (
                    <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">CTA Style</label>
              <Select
                defaultValue={brand?.ctaStyle ?? "Action-oriented"}
                onValueChange={(v) => { if (v) setValue("ctaStyle", v) }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ctaOptions.map((cta) => (
                    <SelectItem key={cta} value={cta}>{cta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Forbidden Words</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a word..."
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addForbiddenWord()
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addForbiddenWord}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {forbiddenWords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {forbiddenWords.map((word) => (
                    <Badge
                      key={word}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => removeForbiddenWord(word)}
                    >
                      {word}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Brand Guidelines</CardTitle>
          <CardDescription>Additional notes and guidelines for content creators</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter brand guidelines, do's and don'ts, target audience information..."
            className="resize-none min-h-[120px]"
            {...register("guidelines")}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        {saveSuccess && (
          <p className="text-sm text-green-600 self-center">Brand saved successfully!</p>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Brand"
          )}
        </Button>
      </div>
    </form>
  )
}
