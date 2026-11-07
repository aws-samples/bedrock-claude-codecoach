import { withAuth } from "@utils/auth";

const complete = withAuth(async () => {
  const response = await fetch("http://localhost:8001/api/v1/chat?q=how%20many%20ec2%20instance%20in%20us-east-1", {
    signal: AbortSignal.timeout(30000),
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
  });
});

export const GET = complete;
export const POST = complete;
