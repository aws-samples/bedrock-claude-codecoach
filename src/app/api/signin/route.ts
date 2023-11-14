
import { NextRequest,NextResponse } from 'next/server'

import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb"; // ES Modules import

import crypto  from "crypto";

import expiredAt from "../../../utils/expirydate";

const DDB_TABLE = process.env.NEXT_PUBLIC_DDB_TABLE||"bedrock-claude-codecoach-users";
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION ||"us-east-1"

console.log(process.env.NEXT_PUBLIC_DDB_TABLE)

interface User{
    email: string
    password: string
}

async function queryUsers(email: string) {

  const client = new DynamoDBClient({ region: AWS_REGION  });

  const params = {
    TableName: DDB_TABLE,
    KeyConditionExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": { S: email }
    }
  };

  const command = new QueryCommand(params);

  const results = await client.send(command);

  return results.Items;
}

export async function POST(req:NextRequest){
  const unauthRes=NextResponse.json({"status":"Bad Request"},{ status: 401 })
  try {
    const user: User= await req.json()

    const foundUsers = await queryUsers(user.email);

    const sha1 = crypto.createHash('sha1');
    sha1.update(user.password);
    const passwordHash = sha1.digest('hex');


    if (foundUsers.length>0&&foundUsers[0].password.S===passwordHash) {
      const res=NextResponse.json({"user":user.email,"role":foundUsers[0].role.S,"expiredAt":expiredAt(1)})
      res.cookies.set('auth',JSON.stringify({"user":user.email,"expiredAt":expiredAt(1)}))
      return res
    } else {
      return  unauthRes
    }

  } catch (error) {
    return  unauthRes
  }





}

