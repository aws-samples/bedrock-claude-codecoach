import { NextResponse } from "next/server";
import { withAuth } from "@utils/auth";
import { readJson } from "@utils/request";

// Network isolation applies to every runtime, including compilation. Removing
// shell/AWS CLI support is a product restriction, not the sandbox boundary.
const languages = ["python", "php", "lua", "typescript", "go", "sqlite3", "rust"];
const enabled = () => process.env.ENABLE_CODE_EXECUTION === "true" && !!process.env.PISTON_SERVER_URL;
let activeJobs = 0;

export const GET = withAuth(async (_request, user) => NextResponse.json({
  enabled: enabled() && user.role === "admin",
  languages,
}));

export const POST = withAuth(async (request, user) => {
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Code execution requires an administrator" }, { status: 403 });
  }
  if (!enabled()) {
    return NextResponse.json({ error: "Code execution is disabled" }, { status: 503 });
  }
  const { code, language } = await readJson(request, 128 * 1024);
  if (typeof code !== "string" || !code || Buffer.byteLength(code) > 100000 || !languages.includes(language)) {
    return NextResponse.json({ error: "Invalid code or unsupported language" }, { status: 400 });
  }
  if (activeJobs >= 2) {
    return NextResponse.json({ error: "Executor is busy" }, { status: 429 });
  }
  activeJobs++;
  try {
    const base = process.env.PISTON_SERVER_URL.replace(/\/$/, "");
    const runtimeResponse = await fetch(`${base}/api/v2/runtimes`, {
      signal: AbortSignal.timeout(5000), redirect: "error", cache: "no-store",
    });
    if (!runtimeResponse.ok) throw new Error("Runtime lookup failed");
    const runtimes = await runtimeResponse.json();
    const runtime = runtimes.find((entry) => entry.language === language || entry.aliases?.includes(language));
    if (!runtime) return NextResponse.json({ error: "Runtime is not installed" }, { status: 400 });
    // Never forward cookies, AWS credentials or caller-selected resource limits.
    const result = await fetch(`${base}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        language, version: runtime.version, files: [{ content: code }],
        compile_timeout: 10000, run_timeout: 10000,
        compile_cpu_time: 10000, run_cpu_time: 5000,
        compile_memory_limit: 268435456, run_memory_limit: 268435456,
      }),
    });
    if (!result.ok) throw new Error("Execution failed");
    return NextResponse.json(await result.json());
  } catch {
    return NextResponse.json({ error: "Executor unavailable" }, { status: 502 });
  } finally {
    activeJobs--;
  }
});
