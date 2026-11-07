import { randomBytes, scryptSync } from "node:crypto";
import { writeFileSync } from "node:fs";

const [email, role, itemFile, credentialsFile] = process.argv.slice(2);
if (!/^[^\s@]+@[^\s@]+$/.test(email) || !["admin", "guest"].includes(role)) {
  throw new Error("Provide an email and either admin or guest");
}
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
writeFileSync(itemFile, JSON.stringify({
  PK: { S: email }, SK: { S: "#ACC" }, role: { S: role },
  password: { S: hash }, authVersion: { S: randomBytes(16).toString("hex") },
}), { mode: 0o600 });
writeFileSync(credentialsFile, `User: ${email}\nPassword: ${password}\n`, { mode: 0o600 });
