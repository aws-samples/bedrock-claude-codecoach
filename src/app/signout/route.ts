import { NextResponse } from "next/server";
import { withAuth, revokeSession } from "@utils/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@utils/session";

export const POST = withAuth(async (_request, user) => {
  await revokeSession(user.id);
  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
});
