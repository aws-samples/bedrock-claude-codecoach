import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { withAuth } from "@utils/auth";
import { uploadDirectory, uploadPath } from "@utils/uploads";
import { readBody, RequestError } from "@utils/request";

export const DELETE = withAuth(async (request, user) => {
  const filePath = uploadPath(user.user, request.nextUrl.searchParams.get("file"));
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return NextResponse.json({ error: "File not found" }, { status: 404 });
    throw error;
  }
  return NextResponse.json({ status: "ok" });
});

export const GET = withAuth(async (_request, user) => {
  try {
    const entries = await fs.readdir(uploadDirectory(user.user), { withFileTypes: true });
    const files = await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => ({
      file: entry.name, size: (await fs.stat(uploadPath(user.user, entry.name))).size,
    })));
    return NextResponse.json({ files });
  } catch (error) {
    if (error.code === "ENOENT") return NextResponse.json({ files: [] });
    throw error;
  }
});

export const POST = withAuth(async (request, user) => {
  const body = await readBody(request);
  const form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw new RequestError("File is required");
  const filePath = uploadPath(user.user, file.name);
  await fs.mkdir(uploadDirectory(user.user), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ status: "ok", file: file.name, size: file.size });
});
