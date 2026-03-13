export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { z } from "zod"

const schema = z.object({
  url: z.string().url(),
})

interface BrandData {
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  colors: string[]
}

function extractColors(html: string): string[] {
  const colors: Set<string> = new Set()

  // Match hex colors
  const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
  const hexMatches = html.match(hexPattern) ?? []
  hexMatches.slice(0, 20).forEach((c) => colors.add(c.toLowerCase()))

  // Match rgb/rgba colors
  const rgbPattern = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/g
  let match
  while ((match = rgbPattern.exec(html)) !== null) {
    const r = parseInt(match[1])
    const g = parseInt(match[2])
    const b = parseInt(match[3])
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    colors.add(hex)
    if (colors.size >= 20) break
  }

  // Filter out near-white and near-black colors
  return Array.from(colors).filter((color) => {
    const hex = color.replace("#", "")
    if (hex.length === 3) return true
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 30 && brightness < 220
  })
}

function extractFontFamily(html: string): string | null {
  const googleFonts = html.match(/fonts\.googleapis\.com\/css[^"']*family=([^"'&]+)/i)
  if (googleFonts) {
    const fontName = decodeURIComponent(googleFonts[1]).split(":")[0].replace(/\+/g, " ")
    return fontName
  }

  const fontFace = html.match(/font-family:\s*['"]?([A-Za-z\s]+)['"]?/i)
  if (fontFace) {
    const font = fontFace[1].trim()
    if (!["serif", "sans-serif", "monospace", "cursive", "inherit", "initial"].includes(font.toLowerCase())) {
      return font
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { url } = parsed.data

  let html: string
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketingGoBot/1.0)",
      },
    })
    clearTimeout(timeout)
    html = await res.text()
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch website. Please check the URL." },
      { status: 422 }
    )
  }

  const colors = extractColors(html)
  const fontFamily = extractFontFamily(html)

  const result: BrandData = {
    primaryColor: colors[0] ?? null,
    secondaryColor: colors[1] ?? null,
    fontFamily,
    colors,
  }

  return NextResponse.json(result)
}
