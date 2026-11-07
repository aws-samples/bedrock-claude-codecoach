import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { QuerySignUsers, SaveSession, ReadSession, DeleteSession } from "./ddb";
import { SESSION_COOKIE, SESSION_SECONDS, SessionClaims, signSession, verifySession, sessionCookieOptions } from "./session";
import { RequestError } from "./request";

export interface AuthenticatedUser extends SessionClaims {
  role: string;
}

// Browser mutations must come from this application. Requests without Origin
// (e.g. CLI clients) still require a valid, server-backed session.
export function isSameOrigin(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function createSession(user: string, version: string, role: string) {
  const id = randomBytes(32).toString("hex");
  const token = await signSession(user, id, version);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await SaveSession(id, user, expiresAt);
  const response = NextResponse.json({ user, role, expiredAt: expiresAt * 1000 });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function authenticate(request: NextRequest): Promise<AuthenticatedUser | null> {
  const claims = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  const session = await ReadSession(claims.id);
  const expiresAt = Number(session?.expiresAt?.N);
  if (session?.user?.S !== claims.user ||
      !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;
  const [account] = await QuerySignUsers(claims.user);
  if (!account || (account.authVersion?.S ?? "0") !== claims.version) return null;
  return { ...claims, role: account.role?.S ?? "guest" };
}

// Every handler validates the session itself, including when middleware is
// skipped. Never trust an identity header or a client-supplied user/role.
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>,
) {
  return async (request: NextRequest) => {
    try {
      const user = await authenticate(request);
      if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOrigin(request)) {
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
      }
      const response = await handler(request, user);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      if (error instanceof RequestError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error("Authenticated request failed", error instanceof Error ? error.name : "Error");
      return NextResponse.json({ error: "Request could not be completed" }, { status: 500 });
    }
  };
}

export async function revokeSession(id: string) {
  await DeleteSession(id);
}
