import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const db = vi.hoisted(() => ({
  accounts: new Map<string, any>(),
  sessions: new Map<string, any>(),
  QueryPrompt: vi.fn(async (_user: string) => []),
  CreatePrompt: vi.fn(),
  DeletePrompt: vi.fn(),
  QueryPromptByPK: vi.fn(async (_pk: string, _owner: string) => []),
}));
vi.mock("@utils/ddb", () => ({
  ...db,
  QuerySignUsers: async (user: string) => db.accounts.has(user) ? [db.accounts.get(user)] : [],
  SaveSession: async (id: string, user: string, expiresAt: number) => {
    db.sessions.set(id, { user: { S: user }, expiresAt: { N: String(expiresAt) } });
  },
  ReadSession: async (id: string) => db.sessions.get(id),
  DeleteSession: async (id: string) => { db.sessions.delete(id); },
  UpdateUser: async (user: string, password: string, previous: string) => {
    const { hashPassword } = await import("@utils/password");
    const account = db.accounts.get(user);
    if (account.password.S !== previous) throw new Error("ConditionalCheckFailed");
    account.password.S = await hashPassword(password);
    account.authVersion = { S: "changed-version" };
    return "changed-version";
  },
}));
vi.mock("@utils/completion", () => ({
  getCompletion: vi.fn(async (_model, _role, _query, _image, _file, _history, writer) => {
    await writer.write("test completion");
    await writer.close();
  }),
}));

import { middleware } from "../src/middleware";
import { signSession, verifySession } from "@utils/session";
import { createSession, authenticate } from "@utils/auth";
import { hashPassword, verifyPassword } from "@utils/password";
import { uploadDirectory, uploadPath } from "@utils/uploads";
import * as signin from "../src/app/api/signin/route";
import * as password from "../src/app/api/password/route";
import * as signout from "../src/app/signout/route";
import * as execute from "../src/app/api/execute/route";
import * as prompts from "../src/app/api/prompt/route";
import * as documents from "../src/app/api/documents/route";
import * as bedrock from "../src/app/api/bedrock/completion/route";
import * as caller from "../src/app/api/caller/route";
import * as autogen from "../src/app/api/autogen/completion/route";

const user = "owner@example.test";
const originalPassword = "a unique old password";
let uploads: string;

function request(route: string, method = "POST", token?: string, body: any = {}, headers: Record<string, string> = {}) {
  return new NextRequest(`https://codecoach.example.test${route}`, {
    method,
    headers: {
      host: "codecoach.example.test",
      "content-type": "application/json",
      ...(token ? { cookie: `auth=${token}` } : {}),
      ...headers,
    },
    ...(method !== "GET" ? { body: JSON.stringify(body) } : {}),
  });
}

async function login(role = "admin", email = user) {
  db.accounts.set(email, { PK: { S: email }, password: { S: await hashPassword(originalPassword) }, role: { S: role } });
  const response = await createSession(email, "0", role);
  return (response as NextResponse).cookies.get("auth")!.value;
}

beforeEach(async () => {
  vi.stubEnv("AUTH_SECRET", "a".repeat(64));
  vi.stubEnv("ENABLE_CODE_EXECUTION", "false");
  vi.stubEnv("PISTON_SERVER_URL", "");
  db.accounts.clear();
  db.sessions.clear();
  vi.clearAllMocks();
  uploads = await fs.mkdtemp(path.join(os.tmpdir(), "codecoach-security-"));
  vi.stubEnv("UPLOAD_DIRECTORY", uploads);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
});
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  await fs.rm(uploads, { recursive: true, force: true });
});

describe("session boundary", () => {
  it.each([undefined, "{}", "{", "null", JSON.stringify({ user, expiredAt: 9999999999999 })])("rejects legacy or malformed cookie %s", async (cookie) => {
    expect(await verifySession(cookie)).toBeNull();
    expect((await middleware(request("/api/prompt", "GET", cookie))).status).toBe(401);
  });

  it("rejects tampering, expiry and key rotation", async () => {
    const token = await signSession(user, "a".repeat(64), "0");
    expect(await verifySession(token)).toMatchObject({ user });
    const [header, payload, signature] = token.split(".");
    const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), sub: "victim@example.test" })).toString("base64url");
    expect(await verifySession(`${header}.${changed}.${signature}`)).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3601000);
    expect(await verifySession(token)).toBeNull();
    vi.useRealTimers();
    vi.stubEnv("AUTH_SECRET", "b".repeat(64));
    expect(await verifySession(token)).toBeNull();
  });

  it("fails closed when a signing key is absent or too short", async () => {
    const token = await signSession(user, "a".repeat(64), "0");
    for (const secret of ["", "short"]) {
      vi.stubEnv("AUTH_SECRET", secret);
      expect(await verifySession(token)).toBeNull();
      await expect(signSession(user, "a".repeat(64), "0")).rejects.toThrow();
    }
  });

  it("rejects tokens without an expiration even with a valid signature", async () => {
    const token = await new SignJWT({ version: "0" }).setSubject(user).setJti("a".repeat(64))
      .setIssuer("codecoach").setAudience("codecoach-session").setIssuedAt()
      .setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("a".repeat(64)));
    expect(await verifySession(token)).toBeNull();
  });

  it("requires a server session and a current account version", async () => {
    const token = await login();
    expect(await authenticate(request("/api/prompt", "GET", token))).toMatchObject({ user, role: "admin" });
    db.accounts.get(user).authVersion = { S: "new-version" };
    expect(await authenticate(request("/api/prompt", "GET", token))).toBeNull();
    db.accounts.get(user).authVersion = { S: "0" };
    db.sessions.clear();
    expect(await authenticate(request("/api/prompt", "GET", token))).toBeNull();
  });

  it("sets secure cookie attributes in production and revokes logout tokens", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const token = await login();
    const response = await signin.POST(request("/api/signin", "POST", undefined, { email: user, password: originalPassword }));
    const cookie = (response as NextResponse).cookies.get("auth")!;
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 3600 });
    expect((await signout.POST(request("/signout", "POST", token))).status).toBe(200);
    expect((await prompts.GET(request("/api/prompt", "GET", token))).status).toBe(401);
  });

  it.each(["1", "not-a-timestamp", undefined])("rejects expired or invalid server-side expiry %s", async (expiry) => {
    const token = await login();
    const claims = await verifySession(token);
    db.sessions.get(claims!.id).expiresAt = { N: expiry };
    expect(await authenticate(request("/api/prompt", "GET", token))).toBeNull();
  });
});

describe("handler authentication independent of middleware", () => {
  const handlers = [
    ["execute", execute.POST], ["execute capabilities", execute.GET],
    ["prompts GET", prompts.GET], ["prompts POST", prompts.POST], ["prompts DELETE", prompts.DELETE],
    ["documents GET", documents.GET], ["documents POST", documents.POST], ["documents DELETE", documents.DELETE],
    ["bedrock", bedrock.POST], ["caller", caller.POST], ["autogen GET", autogen.GET], ["autogen POST", autogen.POST],
    ["password", password.POST], ["signout", signout.POST],
  ] as const;
  it.each(handlers)("%s rejects anonymous requests and forged cookies", async (_label, handler) => {
    for (const token of [undefined, JSON.stringify({ user, expiredAt: 9999999999999 })]) {
      const response = await handler(request("/api/execute", "POST", token, {}, {
        "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware",
        "x-user": user,
      }));
      expect(response.status).toBe(401);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["/api/bedrock/completion", "/api/password", "/api/execute", "/api/future/route"])("protects %s in middleware", async (route) => {
    expect((await middleware(request(route))).status).toBe(401);
  });

  it("rejects cross-origin mutations while allowing same-origin browsers", async () => {
    const token = await login();
    const payload = { name: "test", prompt: "test", user: "victim@example.test" };
    expect((await prompts.POST(request("/api/prompt", "POST", token, payload, { origin: "https://attacker.example.test" }))).status).toBe(403);
    expect((await prompts.POST(request("/api/prompt", "POST", token, payload, { origin: "https://codecoach.example.test" }))).status).toBe(200);
    expect(db.CreatePrompt).toHaveBeenCalledWith(user, "test", "test");
  });
});

describe("password and user isolation", () => {
  it("upgrades legacy passwords, preserves valid login and rejects the public demo password", async () => {
    db.accounts.set(user, { password: { S: createHash("sha256").update(originalPassword).digest("hex") }, role: { S: "admin" } });
    const response = await signin.POST(request("/api/signin", "POST", undefined, { email: user, password: originalPassword }));
    expect(response.status).toBe(200);
    expect(db.accounts.get(user).password.S).toMatch(/^scrypt\$/);
    expect(await authenticate(request("/api/prompt", "GET", (response as NextResponse).cookies.get("auth")!.value))).not.toBeNull();
    expect((await signin.POST(request("/api/signin", "POST", undefined, { email: "admin@demo.com", password: "123456!@#" }))).status).toBe(401);
  });

  it("requires the old password and invalidates all old sessions after a change", async () => {
    const token = await login();
    const other = (await createSession(user, "0", "admin")).cookies.get("auth")!.value;
    const newPassword = "a different strong password";
    expect((await password.POST(request("/api/password", "POST", token, { oldPassword: "wrong", newPassword }))).status).toBe(403);
    const response = await password.POST(request("/api/password", "POST", token, { oldPassword: originalPassword, newPassword }));
    expect(response.status).toBe(200);
    expect(await verifyPassword(newPassword, db.accounts.get(user).password.S)).toBe(true);
    for (const old of [token, other]) expect(await authenticate(request("/api/prompt", "GET", old))).toBeNull();
    expect(await authenticate(request("/api/prompt", "GET", (response as NextResponse).cookies.get("auth")!.value))).not.toBeNull();
  });

  it("uses the authenticated owner for document listings and custom prompts", async () => {
    const token = await login();
    await fs.mkdir(uploadDirectory(user), { recursive: true });
    await fs.writeFile(uploadPath(user, "mine.txt"), "private");
    await fs.mkdir(uploadDirectory("victim@example.test"), { recursive: true });
    await fs.writeFile(uploadPath("victim@example.test", "theirs.txt"), "private");
    const listing = await documents.GET(request("/api/documents?user=victim@example.test", "GET", token));
    expect(await listing.json()).toEqual({ files: [{ file: "mine.txt", size: 7 }] });
    const completion = await bedrock.POST(request("/api/bedrock/completion", "POST", token, { role: "victim-prompt-id", roleType: "custom" }));
    expect(await completion.text()).toBe("test completion");
    expect(db.QueryPromptByPK).toHaveBeenCalledWith("victim-prompt-id", user);
  });

  it.each(["../secret", "/etc/passwd", "..\\\\secret", ".", "..", "bad\\u0000name"])("rejects document traversal %s", async (file) => {
    expect(() => uploadPath(user, file)).toThrow("Invalid filename");
    const token = await login();
    expect((await documents.DELETE(request(`/api/documents?file=${encodeURIComponent(file)}`, "DELETE", token))).status).toBe(400);
    expect((await bedrock.POST(request("/api/bedrock/completion", "POST", token, { file }))).status).toBe(400);
  });
});

describe("code execution controls", () => {
  it("is disabled by default and never contacts Piston", async () => {
    const token = await login();
    expect((await execute.POST(request("/api/execute", "POST", token, { language: "python", code: "print(1)" }))).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires an administrator and reports unavailable capabilities to guests", async () => {
    const token = await login("guest");
    vi.stubEnv("ENABLE_CODE_EXECUTION", "true");
    vi.stubEnv("PISTON_SERVER_URL", "http://executor.internal:2000");
    expect((await execute.POST(request("/api/execute", "POST", token))).status).toBe(403);
    expect(await (await execute.GET(request("/api/execute", "GET", token))).json()).toMatchObject({ enabled: false });
  });

  it("forwards a valid offline job with fixed limits and no caller credentials", async () => {
    const token = await login();
    vi.stubEnv("ENABLE_CODE_EXECUTION", "true");
    vi.stubEnv("PISTON_SERVER_URL", "http://executor.internal:2000");
    const network = vi.fn()
      .mockResolvedValueOnce(NextResponse.json([{ language: "python", version: "3.10.0" }]))
      .mockResolvedValueOnce(NextResponse.json({ run: { stdout: "1\\n", stderr: "" } }));
    vi.stubGlobal("fetch", network);
    const response = await execute.POST(request("/api/execute", "POST", token, { language: "python", code: "print(1)", run_timeout: 999999 }));
    expect(response.status).toBe(200);
    const [url, options] = network.mock.calls[1];
    expect(url).toBe("http://executor.internal:2000/api/v2/execute");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(options.body)).toMatchObject({ run_timeout: 10000, run_memory_limit: 268435456, files: [{ content: "print(1)" }] });
  });

  it("rejects AWS CLI, shell and oversized jobs before forwarding", async () => {
    const token = await login();
    vi.stubEnv("ENABLE_CODE_EXECUTION", "true");
    vi.stubEnv("PISTON_SERVER_URL", "http://executor.internal:2000");
    for (const language of ["awscli", "bash", "unknown"]) {
      expect((await execute.POST(request("/api/execute", "POST", token, { language, code: "test" }))).status).toBe(400);
    }
    expect((await execute.POST(request("/api/execute", "POST", token, { language: "python", code: "x".repeat(150000) }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
});
