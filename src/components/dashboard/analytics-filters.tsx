"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function AnalyticsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`/analytics?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        defaultValue={searchParams.get("days") ?? "30"}
        onValueChange={(v) => { if (v) updateParam("days", v) }}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="14">Last 14 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("platform") ?? "all"}
        onValueChange={(v) => { if (v) updateParam("platform", v) }}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="INSTAGRAM">Instagram</SelectItem>
          <SelectItem value="FACEBOOK">Facebook</SelectItem>
          <SelectItem value="TWITTER">Twitter</SelectItem>
          <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
          <SelectItem value="TIKTOK">TikTok</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
