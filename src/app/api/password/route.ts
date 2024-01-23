import { QuerySignUsers, UpdateUser } from '@utils/ddb';
import { NextRequest,NextResponse} from 'next/server'
import sha256 from "crypto-js/sha256";


/**
 * GET handler for API route
 *
 * @param {NextRequest} req - The request object
 */
export async function GET(req: NextRequest) {
    return NextResponse.json({"status":"ok"})
}



/**
 * POST handler for API route
 *
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {

    try {
        const { oldPassword,newPassword } = await req.json();
        const currentUser = req.cookies.get("auth")?.value
        const email = JSON.parse(currentUser).user
        if (!oldPassword||!newPassword||!currentUser) {
          return new Response("BAD Request", { status: 403 });
        }
        const existUsers = await QuerySignUsers(email);

        const hashDigest = sha256(oldPassword);

        if (existUsers.length > 0) {
            const existUser = existUsers[0];
            
            if (existUser.password.S == hashDigest) {
                await UpdateUser(email,newPassword)
                return NextResponse.json({ "status": `passwordupdate successfully` });
                
            }else{
                return new Response("Old password wrong", { status: 403 }); 
            }   
          }

        return NextResponse.json({ "status": `${email}, update successfully` });
    
      } catch (e) { 
        return new Response("BAD Request", { status: 403 }); 
      }

    
}