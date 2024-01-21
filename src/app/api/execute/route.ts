import { NextRequest,NextResponse} from 'next/server'
import piston from "piston-client";



const pistonURL = process.env.NETX_PUBLIC_PISTON_SERVER_URL || 'http://api:2000';
const pistonRunTimeout = process.env.NETX_PUBLIC_PISTON_RUN_TIMEOUT || 10000;
const baseURL = process.env.NETX_PUBLIC_API_SERVER_URL || 'http://localhost:3000'

const SUPPORTED_LANGUAGES = ["python","php","lua","typescript","go","awscli","sqlite3","rust"]

async function PostAction(payload: {
  history: any[]
  query: string
  role: string
}): Promise<any> {

  try {
    console.log(payload)
    
    const response = await fetch(`${baseURL}/api/bedrock/completion`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhdXRoVHlwZSI6IklBTVJPTEUiLCJha1ZhbHVlIjoiIiwic2tWYWx1ZSI6IiIsImNvZ25pdG9JRFZhbHVlIjoiIiwiY29nbml0b1JlZ2lvblZhbHVlIjoidXMtZWFzdC0xIiwiYWlSb2xlIjoiT1BTQ09BQ0gifQ==`
      },
      body: JSON.stringify(payload)  
    })
    
    const context= await response.text()
    return context

  } catch (error) {
    console.error(error)
    throw new Error('Error making request')
  }

}

/**
 * POST handler for API route
 * 
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {
  try {
    
    const {code,language,question}=await req.json()
    
    console.log(code,language,pistonRunTimeout)

    if (!SUPPORTED_LANGUAGES.includes(language)){
      const res=NextResponse.json({"status":"runtime not exits "},{status:500})
      return res
    }
    
    const stream = new TransformStream();
  
    const result= await (async () => {

      const client = piston({ server: pistonURL });
      
      const runtimes = await client.runtimes();
      console.log(runtimes);
     
      const result = await client.execute({
        language: language,
        runTimeout: 15000,
      }, code);
      
      if (result.run?.stderr===""&& result.run?.stdout!==""&&question){
        console.log("PostAction invoke")
        const answer= await PostAction({"history":[`AWS CLI script output: ${result.run.stdout.replace(/\n/g, '')}`],query:`${question}`, role:"AWSCLIEXPRT"})
        console.log(answer)
        return {run:{answer:answer}}
      }
      return result
  
  })();
    
  const res=NextResponse.json(result)
  return res
  } catch (error) {
      const res=NextResponse.json({"status":"error"},{status:500})
      return res
  }
};


  
