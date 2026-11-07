import { withAuth } from "@utils/auth";
import { getCompletion } from "@utils/completion";
import { GetPrompByRole } from "@utils/prompt";
import { DefaultLLMModel } from "@utils/aws";
import { uploadPath } from "@utils/uploads";
import { readJson, RequestError } from "@utils/request";
import { FileInputProps } from "@utils/loader";

export const POST = withAuth(async (request, user) => {
  const { query = "Hello LLM", history = [], role = "CODECOACH", roleType = "system", model = DefaultLLMModel, image = "", file = "" } = await readJson(request);
  if (typeof query !== "string" || typeof model !== "string" || !model ||
      typeof role !== "string" || typeof roleType !== "string" || !Array.isArray(history)) {
    throw new RequestError("Invalid completion request");
  }
  let fileInput: FileInputProps = null;
  if (file) {
    const filePath = uploadPath(user.user, file);
    const extension = file.split(".").pop()?.toLowerCase();
    fileInput = { fileName: file, filePath, fileType: extension === "csv" || extension === "pdf" ? extension : "text" };
  }
  const prompt = await GetPrompByRole(role, roleType, user.user);
  const stream = new TextEncoderStream();
  void getCompletion(model, role, query, image, fileInput, history, stream.writable.getWriter(), prompt);
  return new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
  });
});
