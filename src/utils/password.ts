import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  if (typeof password !== "string" || password.length > 1024 || typeof stored !== "string") return false;
  if (/^[a-f0-9]{64}$/.test(stored)) {
    // Existing accounts can sign in once and are upgraded to scrypt.
    const digest = createHash("sha256").update(password).digest();
    return timingSafeEqual(digest, Buffer.from(stored, "hex"));
  }
  const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(stored);
  if (!match) return false;
  const actual = await deriveKey(password, match[1], 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}
