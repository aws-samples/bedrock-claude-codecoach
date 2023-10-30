import { NextRequest,} from 'next/server'

import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime"; // ES Modules import

import { 
  CognitoIdentityClient, 
  GetIdCommand,
  GetCredentialsForIdentityCommand 
} from "@aws-sdk/client-cognito-identity";


interface AuthProps {
  authType: string;
  akValue?:string;
  skValue?:string;
  cognitoIDValue?:string;
  cognitoRegionValue?:string;
}

/**
 * Retrieves the chat response from the model and writes it to the provided writer.
 * @param {string} query  - The user's query.
 * @param {WritableStreamDefaultWriter} writer  - The writable stream to write the chat response.
 */
const getCompletion= async (auth:AuthProps, query: string, history: any, writer: any) => {
  try {

    const historyString=JSON.stringify(history)
    const text = `\n\nHuman: The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. The AI will respond with plain string, and will try to keep the responses condensed, in as few lines as possible. If question is not about code , programer , you can say 'Sorry, I'm Coding Coach, only have coding or programme experence'

Context history, use JSON formation, question is:
  ${historyString}

Here is my new question:
  ${query}\n\nAssistant:`;

console.log(text);


    const payload = {
     // "prompt": `\n\nHuman:${query} \n\nAssistant:`,
     "prompt": text , 
     "max_tokens_to_sample": 2048,
      "temperature": 0.2,
      "top_p": 0.9,
    }

    let client = new BedrockRuntimeClient({region: "us-east-1"});
    const {authType,akValue,skValue,cognitoIDValue} = auth

    if (authType==="AKSK"){
      client = new BedrockRuntimeClient({
        region: "us-east-1",
        credentials: {
          accessKeyId: akValue??"", 
          secretAccessKey: skValue??""
        }
      });
    }

    if (authType==="COGNITO"){
      const cognitoClient = new CognitoIdentityClient({
        region: "us-east-1",
      });
      
      const getIdCommand = new GetIdCommand({
        IdentityPoolId: cognitoIDValue
      });
      
      const idResponse = await cognitoClient.send(getIdCommand);
      
      const getCredentialsCommand = new GetCredentialsForIdentityCommand({
        IdentityId: idResponse.IdentityId!
      });
      
      const credentialsResponse = await cognitoClient.send(getCredentialsCommand);
      
      console.log(credentialsResponse.Credentials);
      const ak= credentialsResponse?.Credentials?.AccessKeyId??"";
      const sk= credentialsResponse?.Credentials?.SecretKey??"";
      const sessionToken=credentialsResponse?.Credentials?.SessionToken??"";
     

      client = new BedrockRuntimeClient({
        region: "us-east-1",
        credentials: {
          accessKeyId: ak,
          secretAccessKey: sk,
          sessionToken: sessionToken,
        }
      });
    }


    const input = { // InvokeModelWithResponseStreamRequest
      body: JSON.stringify(payload), // required
      contentType: "application/json",
      accept: "application/json",
      modelId: "anthropic.claude-v2", // required
    };





    const command1 = new InvokeModelWithResponseStreamCommand(input);
    const response = await client.send(command1);

    let chunks: Uint8Array[] = [];

    const encoder = new TextEncoder();


    if (response.body) {

      for await (const item of response.body) {
        if (item.chunk?.bytes) {
          chunks.push(item.chunk.bytes);
          await writer.ready;
          const { completion } = JSON.parse(Buffer.concat([item.chunk.bytes]).toString('utf-8'));
          //console.log(Buffer.concat([item.chunk.bytes]).toString('utf-8'));
          //console.log(completion);
          await writer.write(completion);

        }


      }
      writer.close();
      return;
    }

  } catch (error) {
    console.error('Error retrieving caller identity:', error);
    writer.write(`Error retrieving caller identity , ${auth.authType} auth faild`)
    return
  }
};


/**
 * POST handler for API route
 * 
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const encodedPayload = (authHeader??"").replace("Bearer ", "");
    const decodedPayload = atob(encodedPayload);
    const authPayload = JSON.parse(decodedPayload) as AuthProps;
    
    
    const {query,history}=await req.json()
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    getCompletion(authPayload, query ?? "Hello LLM",history??[], writer);
    return new Response(stream.readable);
  } catch (error) {
    console.log(error)
    return new Response("An error occurred.", { status: 500 });
  }
};



