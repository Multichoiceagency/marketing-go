import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuthenticated = !!req.auth?.user?.id
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register")
  const isApiRoute = req.nextUrl.pathname.startsWith("/api")

  if (isApiRoute) return NextResponse.next()

  if (!isAuthenticated && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
