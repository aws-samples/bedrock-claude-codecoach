import { NextRequest, NextResponse } from "next/server";
import sha256 from "crypto-js/sha256";

import expiredAt from "@utils/expirydate";
import { QuerySignUsers } from "@utils/ddb";


interface User {
  email: string;
  password: string;
}



/**
 * POST handler for API route
 * 
 * @param {NextRequest} req - The request object
 */
export async function POST(req: NextRequest) {
  const unAuthRes = NextResponse.json(
    { error: "Bad Request" },
    { status: 401 }
  );

  try {
    const user: User = await req.json();
   
    const existUsers = await QuerySignUsers(user.email);

    const hashDigest = sha256(user.password);
    

    if (existUsers.length > 0) {
      const existUser = existUsers[0];
      console.log(
        `Exist User : ${existUser.PK.S}, ${existUser.password.S}, ${existUser.role.S}, `
      );

      if (existUser.password.S == hashDigest) {
        const res = NextResponse.json({
          user: user.email,
          role: existUser.role.S,
          expiredAt: expiredAt(1),
        });

        res.cookies.set(
          "auth",
          JSON.stringify({ user: user.email, expiredAt: expiredAt(1) })
        );

        return res;
      }
    }

    return unAuthRes;
  } catch (error) {
    console.error(error);
    return unAuthRes;
  }
}
