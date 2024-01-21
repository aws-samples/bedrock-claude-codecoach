import { NextRequest, } from 'next/server'

import {GetCompletion} from "@utils/completion"
import { GetPrompByRole } from '@utils/prompt'


import { AuthProps } from "@utils/aws"


/**
 * POST handler for API route
 * 
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {
  try {

    const authHeader = req.headers.get("Authorization");
    const encodedPayload = (authHeader ?? "").replace("Bearer ", "");
    const decodedPayload = atob(encodedPayload);
    const authPayload = JSON.parse(decodedPayload) as AuthProps;

    console.log(authPayload)

    const { query, history, role,roleType } = await req.json()

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    

    GetCompletion(role ?? "CODECOACH", query ?? "Hello LLM", history ?? [], writer,await GetPrompByRole(role ?? "CODECOACH", roleType));
    
    return new Response(stream.readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.log(error)
    return new Response("An error occurred.", { status: 500 });
  }
};



