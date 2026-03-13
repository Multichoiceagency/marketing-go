export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWelcomeEmail } from "@/lib/email"
import { z } from "zod"
import bcrypt from "bcryptjs"

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  companyName: z.string().min(2),
  code: z.string().length(6),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, name, companyName, code } = parsed.data

  // Verify OTP
  const identifier = `otp:${email}`
  const token = await prisma.verificationToken.findFirst({
    where: { identifier, token: code, expires: { gte: new Date() } },
  })

  if (!token) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
  }

  // Clean up used token
  await prisma.verificationToken.deleteMany({ where: { identifier } })

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Account already exists. Please sign in." }, { status: 409 })
  }

  // Create user + workspace
  const user = await prisma.user.create({
    data: {
      email,
      name,
      companyName,
      emailVerified: new Date(),
      role: "CLIENT",
    },
  })

  // Create workspace for the company
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).slice(2, 7)

  const workspace = await prisma.workspace.create({
    data: {
      name: companyName,
      slug,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  })

  // Send welcome email
  const loginUrl = `${process.env.NEXTAUTH_URL ?? ""}/login`
  try {
    await sendWelcomeEmail(email, name, loginUrl)
  } catch (err) {
    console.error("Failed to send welcome email:", err)
  }

  return NextResponse.json({ user: { id: user.id, email, name }, workspace: { id: workspace.id, name } })
}
