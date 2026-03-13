export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationCode } from "@/lib/email"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
})

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 })
  }

  const { email } = parsed.data
  const code = generateCode()
  const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  // Store code as verification token
  const identifier = `otp:${email}`
  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: { identifier, token: code, expires },
  })

  const user = await prisma.user.findUnique({ where: { email } })

  try {
    await sendVerificationCode(email, code, user?.companyName ?? undefined)
  } catch (err) {
    console.error("Failed to send email:", err)
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 500 })
  }

  return NextResponse.json({ sent: true, isNewUser: !user })
}
