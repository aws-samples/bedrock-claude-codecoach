import { NextRequest,NextResponse} from 'next/server'
import piston from "piston-client";



const pistonURL = process.env.NETX_PUBLIC_PISTON_SERVER_URL || 'http://localhost:2000';

const SUPPORTED_LANGUAGES = ["python","php","lua","typescript","go"]

/**
 * POST handler for API route
 * 
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {
  try {
    
    const {code,language}=await req.json()
    
    console.log(code,language)

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
        //language: "python",version:"3.10.0"
        language: language
      }, code);
      return result
  
  })();
    
  const res=NextResponse.json(result)
  return res
  } catch (error) {
      const res=NextResponse.json({"status":"error"},{status:500})
      return res
  }
};


  