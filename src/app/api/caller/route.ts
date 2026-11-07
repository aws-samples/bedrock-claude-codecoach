import { NextResponse } from "next/server";
import { AWSConfig, STSClient, AWSRegion } from "@utils/aws";
import { withAuth } from "@utils/auth";

export const POST = withAuth(async () => {
  const client = new STSClient(AWSConfig());
  const { Arn } = await client.getCallerIdentity();
  return NextResponse.json({ me: AWSRegion + " | " + Arn });
});
