import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vercel Cron must reach the backup runner without a login cookie —
  // the route does its own auth (CRON_SECRET / cookie check inside).
  if (pathname === "/api/backup/run") {
    return NextResponse.next();
  }

  // Always allow login page and auth API
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    // If already logged in, redirect away from login page
    if (pathname === "/login") {
      const token = request.cookies.get("auth_token")?.value;
      const secret = process.env.AUTH_SECRET;
      if (token && secret && token === secret) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Check auth cookie for all other routes
  const token = request.cookies.get("auth_token")?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret || token !== secret) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
