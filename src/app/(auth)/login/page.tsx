"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Loader2, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [step, setStep] = useState<"email" | "code">("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to send code")
      setStep("code")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        code,
        redirect: false,
      })
      if (result?.error) {
        setError("Invalid or expired code. Please try again.")
        return
      }
      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (step === "code") {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 dark:bg-blue-950 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">Verification Code</label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
          </div>
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify & Sign in"}
          </Button>
        </form>
        <button
          onClick={() => { setStep("email"); setCode(""); setError(null) }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Use different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Email address</label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading || !email}>
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending code...</>
        ) : (
          <><Mail className="mr-2 h-4 w-4" />Send verification code</>
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New company?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4 hover:text-primary">
          Create an account
        </Link>
      </p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Marketing Go</h1>
            <p className="text-sm text-muted-foreground mt-1">Agency Portal</p>
          </div>
        </div>
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>We will send a 6-digit code to your email</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-32 animate-pulse bg-muted rounded-md" />}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Protected by Marketing Go. All rights reserved.
        </p>
      </div>
    </div>
  )
}
