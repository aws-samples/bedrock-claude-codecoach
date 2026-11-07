import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "auth";
export const SESSION_SECONDS = 3600;
const issuer = "codecoach";
const audience = "codecoach-session";

export interface SessionClaims {
  user: string;
  id: string;
  version: string;
  expiresAt: number;
}

function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 bytes");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: string, id: string, version: string) {
  return new SignJWT({ version })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user)
    .setJti(id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(signingKey());
}

export async function verifySession(token?: string): Promise<SessionClaims | null> {
  if (!token || token.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
      issuer,
      audience,
      maxTokenAge: SESSION_SECONDS,
      requiredClaims: ["sub", "jti", "iat", "exp", "version"],
    });
    if (
      typeof payload.sub !== "string" || !payload.sub ||
      typeof payload.jti !== "string" || !/^[a-f0-9]{64}$/.test(payload.jti) ||
      typeof payload.version !== "string" ||
      !Number.isSafeInteger(payload.exp)
    ) return null;
    return {
      user: payload.sub,
      id: payload.jti,
      version: payload.version,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}
