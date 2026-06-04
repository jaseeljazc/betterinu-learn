import { NextRequest, NextResponse } from "next/server"

/**
 * proxy.ts (formerly middleware.ts — renamed in Next.js 16)
 *
 * Responsibilities:
 *  1. CORS — inject Access-Control-* headers for all /api/student/** and
 *     /api/upload routes so the separate betterinu-learn student frontend
 *     can call them from localhost *and* from its Vercel deployment.
 *  2. Cookie-presence guard — lightweight session check. Full token + DB
 *     verification happens inside each API route handler (firebase-admin is
 *     too heavy for the Edge runtime).
 *
 * Admin routes: /admin/** and /api/admin/**  → require __session cookie
 * Student routes: everything else            → require __session cookie
 */

// ── CORS ─────────────────────────────────────────────────────────────────────

/**
 * Origins that are allowed to call the student API cross-domain.
 * Add NEXT_PUBLIC_STUDENT_APP_URL (and its deployed Vercel URL) to
 * .env.local on the backend so this list stays up-to-date without
 * touching source code.
 */
const STUDENT_ORIGINS: string[] = [
  // Local dev — student frontend default port
  "http://localhost:3001",
  "http://localhost:3000",
  // Deployed student frontend — set this in Vercel env vars
  ...(process.env.NEXT_PUBLIC_STUDENT_APP_URL
    ? [process.env.NEXT_PUBLIC_STUDENT_APP_URL.replace(/\/$/, "")]
    : []),
  ...(process.env.STUDENT_APP_DEPLOYED_URL
    ? [process.env.STUDENT_APP_DEPLOYED_URL.replace(/\/$/, "")]
    : []),
]

/** Routes that receive CORS treatment (student API + shared upload). */
const CORS_PREFIXES = ["/api/student/", "/api/upload", "/api/receipts/"]

function isCorsRoute(pathname: string): boolean {
  return CORS_PREFIXES.some((p) => pathname.startsWith(p))
}

function getAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null
  return STUDENT_ORIGINS.includes(origin) ? origin : null
}

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigin(origin)
  if (!allowed) return {}
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    // credentials: true is intentionally omitted — we use Bearer tokens
    // from the student frontend, not cookies, so credentials aren't needed.
    "Vary": "Origin",
  }
}

// ── Auth gate ────────────────────────────────────────────────────────────────

const PUBLIC_PATHS = [
  "/login",
  "/admin/login",
  "/api/student/auth/verify",
  "/api/admin/auth/verify",
  "/api/auth/refresh-session",
]

/** Routes that skip the cookie guard entirely (already token-gated inside). */
const API_PUBLIC_PREFIXES = ["/api/student/", "/api/upload", "/api/receipts/"]

// ── Main handler ─────────────────────────────────────────────────────────────

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get("host") || ""
  const origin = req.headers.get("origin")
  const corsHeaders = isCorsRoute(pathname) ? buildCorsHeaders(origin) : {}

  // Handle CORS preflight early — no auth check needed
  if (req.method === "OPTIONS" && isCorsRoute(pathname)) {
    return new NextResponse(null, { status: 204, headers: corsHeaders })
  }

  // 1. Detect admin subdomain (e.g. admin.localhost:3000 or admin.yourdomain.com)
  const isAdminSubdomain = hostname.startsWith("admin.")

  // 2. Rewrite subdomain requests to the /admin route group path internally
  const rewrittenUrl = req.nextUrl.clone()
  if (
    isAdminSubdomain &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api")
  ) {
    rewrittenUrl.pathname = `/admin${pathname}`
  }

  const effectivePathname =
    isAdminSubdomain && !pathname.startsWith("/api")
      ? `/admin${pathname}`
      : pathname

  // Pass through public routes
  if (PUBLIC_PATHS.some((p) => effectivePathname.startsWith(p))) {
    const res =
      isAdminSubdomain &&
      !pathname.startsWith("/admin") &&
      !pathname.startsWith("/api")
        ? NextResponse.rewrite(rewrittenUrl)
        : NextResponse.next()
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // Student API routes are token-gated inside the handler — skip cookie guard
  if (API_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    const res = NextResponse.next()
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  const isAdminRoute =
    effectivePathname.startsWith("/admin") ||
    effectivePathname.startsWith("/api/admin")

  const token = req.cookies.get("__session")?.value

  if (!token) {
    const loginPath = isAdminSubdomain
      ? "/login"
      : isAdminRoute
        ? "/admin/login"
        : "/login"
    const loginUrl = new URL(loginPath, req.url)
    if (isAdminSubdomain) loginUrl.host = hostname
    return NextResponse.redirect(loginUrl)
  }

  // Admin subdomain rewrite with session present
  if (
    isAdminSubdomain &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api")
  ) {
    return NextResponse.rewrite(rewrittenUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
}
