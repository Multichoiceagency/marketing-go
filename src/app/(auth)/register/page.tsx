"use client"

import { Suspense, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Mail, ArrowLeft, Building2 } from "lucide-react"
import Link from "next/link"

function RegisterForm() {
  const router = useRouter()
  const [step, setStep] = useState<"form" | "code">("form")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ email: "", name: "", companyName: "" })
  const [code, setCode] = useState("")

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
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

  const register = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Registration failed")

      // Auto sign in after registration by sending another code
      await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      })

      // Sign in with the same code (already consumed, need new one)
      router.push(`/login?registered=1`)
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
            We sent a 6-digit code to <strong>{form.email}</strong>. Enter it below to complete registration.
          </p>
        </div>
        <form onSubmit={register} className="space-y-4">
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
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : "Create account"}
          </Button>
        </form>
        <button
          onClick={() => { setStep("form"); setCode(""); setError(null) }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="companyName" className="text-sm font-medium">Company name</label>
        <Input
          id="companyName"
          placeholder="Rijschool Zumrut"
          value={form.companyName}
          onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Your name</label>
        <Input
          id="name"
          placeholder="Jan de Vries"
          value={form.name}
          onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Work email</label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
          required
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending code...</>
        ) : (
          <><Mail className="mr-2 h-4 w-4" />Send verification code</>
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4 hover:text-primary">
          Sign in
        </Link>
      </p>
    </form>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join Marketing Go as a client company</p>
          </div>
        </div>
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Register your company</CardTitle>
            <CardDescription>We will send a verification code to confirm your email</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-48 animate-pulse bg-muted rounded-md" />}>
              <RegisterForm />
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
