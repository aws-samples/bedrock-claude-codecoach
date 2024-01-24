
import { NextRequest ,NextResponse } from "next/server";


// Define protected routes that require authentication
const protectedRoutes = ["/chat","/prompt"];
const protectedAPIRoutes =["/api/prompt","/api/caller","/api/beckrock/completion","/api/autogen/completion"]

// Define authentication routes that should redirect if user is already logged in  
const authRoutes = ["/signin"];


export function middleware(request: NextRequest) {
  // Get current user cookie if it exists
  const currentUser = request.cookies.get("auth")?.value;
  
  // If trying to access protected API route without being logged in, return 403
  if (
    protectedAPIRoutes.includes(request.nextUrl.pathname) &&
    (!currentUser || Date.now() > JSON.parse(currentUser).expiredAt)
  ){
    return new Response("BAD Request", { status: 403 }); 
  }

  // If trying to access protected route without being logged in, redirect to sign in
  //console.log(protectedRoutes.includes(request.nextUrl.pathname),currentUser)
    
  if (
    protectedRoutes.includes(request.nextUrl.pathname) &&
    (!currentUser || Date.now() > JSON.parse(currentUser).expiredAt)
  ) {
    // Delete auth cookie and redirect to sign in page, if expired 

    
    const response = NextResponse.redirect(new URL("/signin", request.url));
    request.cookies.delete("auth");
    response.cookies.delete("auth");
    return response;
  }
 
  // If trying to access sign in page while already logged in, redirect to chat
  if (authRoutes.includes(request.nextUrl.pathname) && currentUser) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }
}



