import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./utils/session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(/\/+$/, "");
  if (pathname === "/api/signin") return NextResponse.next();
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const response = NextResponse.redirect(new URL("/signin", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/api/:path*", "/chat/:path*", "/prompt/:path*"],
};
