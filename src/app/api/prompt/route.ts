import { readJson, RequestError } from "@utils/request";
import { NextResponse } from "next/server";
import { QueryPrompt, CreatePrompt, DeletePrompt } from "@utils/ddb";
import { withAuth } from "@utils/auth";

export const GET = withAuth(async (_request, user) => {
  return NextResponse.json(await QueryPrompt(user.user));
});

export const POST = withAuth(async (request, user) => {
  const { name, prompt } = await readJson(request, 128 * 1024);
  if (typeof name !== "string" || !name || name.length > 200 ||
      typeof prompt !== "string" || prompt.length > 100000) {
    return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
  }
  await CreatePrompt(user.user, name, prompt);
  return NextResponse.json({ status: "Prompt created" });
});

export const DELETE = withAuth(async (request, user) => {
  const { promptID } = await readJson(request, 128 * 1024);
  if (typeof promptID !== "string" || !/^[a-f0-9]{32}$/.test(promptID)) {
    return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
  }
  await DeletePrompt(user.user, promptID);
  return NextResponse.json({ status: "Prompt deleted" });
});
