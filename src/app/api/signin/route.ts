import { readJson, RequestError } from "@utils/request";
import { NextRequest, NextResponse } from "next/server";
import { QuerySignUsers, UpdateUser } from "@utils/ddb";
import { createSession, isSameOrigin } from "@utils/auth";
import { verifyPassword } from "@utils/password";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  try {
    const { email, password } = await readJson(request, 128 * 1024);
    if (typeof email !== "string" || !email || email.length > 254 ||
        typeof password !== "string" || !password || password.length > 1024 ||
        (email === "admin@demo.com" && password === "123456!@#")) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const [account] = await QuerySignUsers(email);
    if (!account || !await verifyPassword(password, account.password?.S)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    let version = account.authVersion?.S ?? "0";
    if (!account.password.S.startsWith("scrypt$")) {
      version = await UpdateUser(email, password, account.password.S);
    }
    return await createSession(email, version, account.role?.S ?? "guest");
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Sign-in failed", error instanceof Error ? error.name : "Error");
    return NextResponse.json({ error: "Sign-in unavailable" }, { status: 503 });
  }
}
