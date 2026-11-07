import { readJson, RequestError } from "@utils/request";
import { NextResponse } from "next/server";
import { QuerySignUsers, UpdateUser } from "@utils/ddb";
import { withAuth, createSession, revokeSession } from "@utils/auth";
import { verifyPassword } from "@utils/password";

export const POST = withAuth(async (request, user) => {
  const { oldPassword, newPassword } = await readJson(request, 128 * 1024);
  if (typeof oldPassword !== "string" || typeof newPassword !== "string" ||
      newPassword.length < 12 || newPassword.length > 1024 || oldPassword === newPassword) {
    return NextResponse.json({ error: "Use a different password of 12–1024 characters" }, { status: 400 });
  }
  const [account] = await QuerySignUsers(user.user);
  if (!account || !await verifyPassword(oldPassword, account.password?.S)) {
    return NextResponse.json({ error: "Old password is incorrect" }, { status: 403 });
  }
  const version = await UpdateUser(user.user, newPassword, account.password.S);
  await revokeSession(user.id);
  // Changing the account version invalidates every previous session.
  return createSession(user.user, version, user.role);
});
