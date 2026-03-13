import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = token.role
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Verification Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null

        const email = credentials.email as string
        const code = credentials.code as string

        // Verify OTP code
        const identifier = `otp:${email}`
        const token = await prisma.verificationToken.findFirst({
          where: { identifier, token: code, expires: { gte: new Date() } },
        })

        if (!token) return null

        // Clean up used token
        await prisma.verificationToken.deleteMany({ where: { identifier } })

        // Find user
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        // Mark email as verified on first login
        if (!user.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          })
        }

        return user
      },
    }),
  ],
})
