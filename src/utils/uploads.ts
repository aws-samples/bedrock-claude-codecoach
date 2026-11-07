import crypto from "node:crypto";
import path from "node:path";
import { RequestError } from "./request";

export function uploadDirectory(user: string) {
  // Preserve existing users' directories; the user now comes from the session.
  const directory = crypto.createHash("sha1").update(`CodeCoach@#/${user}`).digest("hex").substring(0, 32);
  return path.resolve(process.env.UPLOAD_DIRECTORY || "./uploads", directory);
}

export function uploadPath(user: string, filename: unknown) {
  if (typeof filename !== "string" || !filename || filename.length > 255 ||
      filename === "." || filename === ".." || /[/\\\u0000-\u001f]/.test(filename)) {
    throw new RequestError("Invalid filename");
  }
  return path.join(uploadDirectory(user), filename);
}
