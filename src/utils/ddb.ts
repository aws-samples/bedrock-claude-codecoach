

import { DynamoDBClient, QueryCommand, PutItemCommand, UpdateItemCommand,DeleteItemCommand, AttributeValue } from "@aws-sdk/client-dynamodb";

import crypto from 'crypto'; 
import { AWSConfig } from "./aws";

function generateSHA1(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex').substring(0, 32);
}



const client = new DynamoDBClient(AWSConfig())


const userTableName = "bedrock-claude-codecoach";
const dynamodbTableName =
  process.env.NEXT_PUBLIC_DDB_TABLE || "bedrock-claude-codecoach";

async function QuerySignUsers(email: string) {
    
    console.log("QuerySignUsers invoke")
  
    // 构造查询参数
    const params = {
      TableName: dynamodbTableName,
      KeyConditionExpression: "PK = :value",
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




const GeneratePrompt = (email: string, name:string, prompt:string) => {
    return {
        
        PK: {S: generateSHA1(email+"|"+name+"|"+prompt).toString()},
        SK: { S: email }, // Partition key
        name: { S: name },
        prompt: { S: prompt}, // Other properties
    };
}

const CreatePrompt =async (email: string, name:string, prompt :string) => {
    const item = GeneratePrompt(email, name,prompt);
    PutItem(dynamodbTableName, item);
    return dynamoDBToJSON(item);
}


const DeletePrompt = async (owner:string, promptID:string) =>{
    const params = {
        TableName: dynamodbTableName,
        Key: {
          PK: { S: promptID}, 
          SK: { S: owner  }
        }
      };
    const command = new DeleteItemCommand(params);
    return client.send(command);
}


const PutItem = async (tableName:string,item: Record<string, AttributeValue>) => {
    try {
        const putCommand = new PutItemCommand({
            TableName: tableName,
            Item: item
        });
        const data = await client.send(putCommand);
        console.log("Success - item added:", data);
    } catch (error) {
        console.error("Error - item not added:", error);
    }
}

const QueryPrompt = async (email: string) => {
    console.log(dynamodbTableName)
    const command = new QueryCommand({
        TableName: dynamodbTableName,
        IndexName: "SK-index", 
        KeyConditionExpression: "SK = :email",
        ExpressionAttributeValues: {
            ":email": { "S": email }
        }
    });
    const response = await client.send(command);
    return response.Items.map(dynamoDBToJSON);
}


const QueryPromptByPK = async (pk: string) => {
    console.log(dynamodbTableName)
    const command = new QueryCommand({
        TableName: dynamodbTableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
            ":pk": { "S": pk }
        }
    });
    const response = await client.send(command);
    return response.Items.map(dynamoDBToJSON);
}

const QueryUser = async (email: string) => {
    const command = new QueryCommand({
        TableName: "docsummary",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
            ":email": { "S": email }
        }
    });
    const response = await client.send(command);
    return response.Items.map(dynamoDBToJSON);
}

function dynamoDBToJSON(data) {
    const converted = {};

    for (const key in data) {
        const value = data[key];
        //Hide SK 
        if (key!=="SK"){
            if (value.S) {
                converted[key] = value.S;
            } else if (value.N) {
                converted[key] = parseInt(value.N);
            } else {
                converted[key] = value;
            }
        }
       
    }

    return converted;
}

const UpdateUser = async (email: string, count: number) => {
    const updateCommand = new UpdateItemCommand({
        TableName: userTableName,
        Key: {
            email: { S: email }
        },
        UpdateExpression: "set #ct = :count",
        ExpressionAttributeNames: {
            "#ct": "count"
        },
        ExpressionAttributeValues: {
            ":count": { N: count.toString() }
        }
    });

    try {
        await client.send(updateCommand);
        console.log("Success - item updated");
    } catch (error) {
        console.error("Error - failed to update item:", error);
    }
}

export {  QueryUser,QuerySignUsers, PutItem, dynamoDBToJSON, UpdateUser, CreatePrompt,QueryPrompt,DeletePrompt ,QueryPromptByPK }