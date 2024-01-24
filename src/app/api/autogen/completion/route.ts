import { NextRequest, } from 'next/server'
import axios ,{ AxiosResponse } from 'axios'
/**
 * POST handler for API route
 * 
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {
    try {
  
      
      const { query, history, role } = await req.json()
  
      //const stream = new TransformStream();
      //const writer = stream.writable.getWriter();
      
      //return new Response(stream.readable);

    const response = await axios.get('http://localhost:8001/api/v1/chat?q=how%20many%20ec2%20instance%20in%20us-east-1');
    
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    writer.write(response.data);
    writer.close();
    return new Response(stream.readable, { status: 200 });

    //  return new Response(query, { status: 200 });
    } catch (error) {
      console.log(error)
      return new Response("An error occurred.", { status: 500 });
    }
  };




export async function GET() {
    try {
      const response = await fetch('http://localhost:8001/api/v1/chat?q=how%20many%20ec2%20instance%20in%20us-east-1');
      
      const { readable, writable } = new TransformStream();
  
      const writer = writable.getWriter();
      const reader = response.body!.getReader();
  
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          writer.write(value);
        }
  
        writer.close();
      };
  
      pump();
  
      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (error) {
      console.log(error);
      return new Response("An error occurred.", { status: 500 });
    }
  };

