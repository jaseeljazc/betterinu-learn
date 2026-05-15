import { NextRequest, NextResponse } from "next/server";

/**
 * proxy.ts (formerly middleware.ts — renamed in Next.js 16)
 *
 * Lightweight cookie-presence guard only.
 * Full token + DB verification happens inside each API route handler
 * (firebase-admin is too heavy for the Edge runtime).
 *
 * Admin routes: /admin/** and /api/admin/**  → require __session cookie, redirect to /admin/login
 * Student routes: everything else            → require __session cookie, redirect to /login
 */

const PUBLIC_PATHS = [
  "/login",
  "/admin/login",
  "/api/student/auth/verify",
  "/api/admin/auth/verify",
  "/api/auth/refresh-session",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // 1. Detect if this is the admin subdomain (e.g. admin.localhost:3000 or admin.yourdomain.com)
  const isAdminSubdomain = hostname.startsWith("admin.");

  // 2. Rewrite subdomain requests to the /admin route group path
  // If the user visits admin.localhost:3000/login, we rewrite to /admin/login internally
  let rewrittenUrl = req.nextUrl.clone();
  if (isAdminSubdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    rewrittenUrl.pathname = `/admin${pathname}`;
    // We rewrite, not redirect, so the URL in the browser stays admin.localhost:3000
    // But internally Next.js processes it as /admin/...
  }

  const effectivePathname = isAdminSubdomain && !pathname.startsWith("/api") ? `/admin${pathname}` : pathname;

  // Pass through public routes
  if (PUBLIC_PATHS.some((p) => effectivePathname.startsWith(p))) {
    if (isAdminSubdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
      return NextResponse.rewrite(rewrittenUrl);
    }
    return NextResponse.next();
  }

  const isAdminRoute = effectivePathname.startsWith("/admin") || effectivePathname.startsWith("/api/admin");

  const token = req.cookies.get("__session")?.value;

  if (!token) {
    // If on admin subdomain, redirect to /login (which rewrites to /admin/login)
    const loginPath = isAdminSubdomain ? "/login" : (isAdminRoute ? "/admin/login" : "/login");
    const loginUrl = new URL(loginPath, req.url);
    if (isAdminSubdomain) {
        loginUrl.host = hostname;
    }
    return NextResponse.redirect(loginUrl);
  }

  // If we are on the admin subdomain and need to rewrite, do it now
  if (isAdminSubdomain && !pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    return NextResponse.rewrite(rewrittenUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
