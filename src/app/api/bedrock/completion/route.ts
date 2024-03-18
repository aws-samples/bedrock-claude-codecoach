import { NextRequest, } from 'next/server'

import {getCompletion} from "@utils/completion"
import { GetPrompByRole } from '@utils/prompt'
import path from "path";
import crypto from 'crypto'; 

import { AuthProps } from "@utils/aws"

import {FileInputProps} from "@utils/loader"

const securityCode="CodeCoach@#"


function getFileType(fileName: string): "text" | "csv" | "url" | "youtube" | "pdf" {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === "csv" || extension === "url" || extension === "youtube" || extension === "pdf") {
    return extension;
  }

  return "text";
}

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

   

    const { query, history, role,roleType,model,image,file } = await req.json()


    console.log(authPayload,model)

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const currentUser = JSON.parse (req.cookies.get("auth")?.value);
    const userSha1=crypto.createHash('sha1').update(`${securityCode}/${currentUser.user}`).digest('hex').substring(0, 32);


    let fileInput=null 

    if (file!==""){
      const filePath = path.join("./uploads",`${userSha1}/`, file);
      
      fileInput={"fileName":file,"filePath":filePath,"fileType":getFileType(file)} as FileInputProps
      console.log(fileInput)  
    }

    getCompletion(model,role ?? "CODECOACH", query ?? "Hello LLM",image??"",fileInput, history ?? [], writer,await GetPrompByRole(role ?? "CODECOACH", roleType));
    
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



