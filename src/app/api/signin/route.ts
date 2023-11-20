import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import sha256 from "crypto-js/sha256";

import expiredAt from "../../../utils/expirydate";

const DDB_TABLE = process.env.NEXT_PUBLIC_DDB_TABLE||"bedrock-claude-codecoach-users";
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION ||"us-east-1"

interface User {
  email: string;
  password: string;
}

async function queryUsers(email: string) {
  // 创建 DynamoDB 客户端
  const client = new DynamoDBClient({ region: AWS_REGION });

  // 构造查询参数
  const params = {
    TableName: DDB_TABLE,
    KeyConditionExpression: "email = :value",
    ExpressionAttributeValues: {
      ":value": { S: email },
    },
  };

  // 创建 QueryCommand 实例
  const command = new QueryCommand(params);

  // 使用 execute 方法执行查询
  const results = await client.send(command);

  return results.Items;
}

export async function POST(req: NextRequest) {
  const unAuthRes = NextResponse.json(
    { error: "Bad Request" },
    { status: 401 }
  );

  try {
    const user: User = await req.json();
    // console.log(`User email : ${user.email}, pass : ${user.password}`);

    const existUsers = await queryUsers(user.email);

    const hashDigest = sha256(user.password);
    console.log(`hashDigest : ${hashDigest}`);

    if (existUsers.length > 0) {
      const existUser = existUsers[0];
      console.log(
        `Exist User : ${existUser.email.S}, ${existUser.password.S}, ${existUser.role.S}, `
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
