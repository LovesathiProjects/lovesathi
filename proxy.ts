import { NextResponse, type NextRequest } from "next/server"

const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=(self), payment=(self)",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://appleid.apple.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://accounts.google.com https://appleid.apple.com",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; "),
}

function withSecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
  return response
}

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const hostname = (forwardedHost || request.nextUrl.hostname).split(":")[0]?.toLowerCase() || request.nextUrl.hostname.toLowerCase()
  const pathname = request.nextUrl.pathname
  const isAdminHost = hostname === "admin.lovesathi.com"
  const isWwwHost = hostname === "www.lovesathi.com"
  const isAssetOrApi =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/apple-icon.svg" ||
    pathname === "/manifest.json"

  if (isWwwHost) {
    const url = request.nextUrl.clone()
    url.hostname = "lovesathi.com"
    return withSecurityHeaders(NextResponse.redirect(url, 301))
  }

  if (isAdminHost && pathname !== "/admin" && !pathname.startsWith("/admin/") && !isAssetOrApi) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    return withSecurityHeaders(NextResponse.rewrite(url))
  }

  return withSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
