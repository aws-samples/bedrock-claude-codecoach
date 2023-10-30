
import { NextRequest,NextResponse } from 'next/server'
 

export async function GET(req:NextRequest){
  const origin = req.headers.get('host');
  const redirectUrl = `http://${origin}/signin`;
  
  req.cookies.delete("auth");
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete("auth");
  return response
  
}

