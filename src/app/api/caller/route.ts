
import { NextRequest, NextResponse } from 'next/server'
import { AuthProps,AWSConfig, STSClient,AWSRegion } from "@utils/aws"



/**
 * POST handler for API route
 * 
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {
  try {

    const authProps: AuthProps = await req.json(); // Extract the authType from the request body
    // Perform any required logic with the authType value
    const client = new STSClient(AWSConfig())
    const { Arn } = await client.getCallerIdentity();
    return NextResponse.json({ me: AWSRegion+" | "+Arn });
  } catch {
    return new Response("BAD Request", { status: 403 });

  }


}
