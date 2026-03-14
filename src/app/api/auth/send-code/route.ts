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
  try {
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

    // Try to send email, but allow fallback if SMTP is not configured
    let emailSent = false
    let emailError: string | null = null
    try {
      await sendVerificationCode(email, code, user?.companyName ?? undefined)
      emailSent = true
    } catch (smtpErr) {
      console.error("SMTP error:", smtpErr)
      emailError = smtpErr instanceof Error ? smtpErr.message : "Email sending failed"
    }

    // If email failed and SMTP is not properly configured, return code directly (dev mode)
    const smtpConfigured = process.env.SMTP_EMAIL && 
      !process.env.SMTP_EMAIL.includes("placeholder") &&
      process.env.SMTP_PASSWORD && 
      !process.env.SMTP_PASSWORD.includes("placeholder")

    if (!emailSent && !smtpConfigured) {
      console.log(`[DEV] Verification code for ${email}: ${code}`)
      return NextResponse.json({ 
        sent: true, 
        isNewUser: !user,
        devMode: true,
        code // Return code when SMTP not configured
      })
    }

    if (!emailSent) {
      return NextResponse.json({ error: emailError || "Failed to send verification email" }, { status: 500 })
    }

    return NextResponse.json({ sent: true, isNewUser: !user })
  } catch (err) {
    console.error("send-code error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
