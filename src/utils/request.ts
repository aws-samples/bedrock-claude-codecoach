export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readBody(request: Request, limit = 10 * 1024 * 1024) {
  if (Number(request.headers.get("content-length")) > limit) {
    throw new RequestError("Request is too large", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError("Request body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new RequestError("Request is too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function readJson(request: Request, limit?: number) {
  try {
    const payload = JSON.parse((await readBody(request, limit)).toString("utf8"));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new RequestError("Expected a JSON object");
    }
    return payload;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError("Invalid JSON");
  }
}
