import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT ?? "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendVerificationCode(to: string, code: string, companyName?: string) {
  const fromName = "Marketing Go"
  const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_EMAIL
  const from = `${fromName} <${fromEmail}>`

  await transporter.sendMail({
    from,
    to,
    subject: `Your verification code: ${code}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f172a;">Sign in to Marketing Go</h2>
        ${companyName ? `<p>Welcome, <strong>${companyName}</strong>!</p>` : ""}
        <p>Use this verification code to complete your sign-in:</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">Marketing Go — Agency Portal</p>
      </div>
    `,
  })
}

export async function sendWelcomeEmail(to: string, name: string, loginUrl: string) {
  const fromEmail = process.env.SMTP_FROM ?? process.env.SMTP_EMAIL
  const from = `Marketing Go <${fromEmail}>`
  
  await transporter.sendMail({
    from,
    to,
    subject: "Welcome to Marketing Go!",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f172a;">Welcome to Marketing Go, ${name}!</h2>
        <p>Your account has been created. You can now access the portal to collaborate on your marketing projects.</p>
        <a href="${loginUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          Sign in to Portal
        </a>
        <p style="color: #64748b; font-size: 14px;">If you have any questions, just reply to this email.</p>
      </div>
    `,
  })
}
