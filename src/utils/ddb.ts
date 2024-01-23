
import sha256 from "crypto-js/sha256";
import { DynamoDBClient, QueryCommand, PutItemCommand,UpdateItemCommand, DeleteItemCommand, AttributeValue } from "@aws-sdk/client-dynamodb";

import crypto from 'crypto'; 
import { AWSConfig } from "./aws";


function generateSHA1(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex').substring(0, 32);
}




const dynamodbTableName =
  process.env.NEXT_PUBLIC_DDB_TABLE || "bedrock-claude-codecoach";
const client = new DynamoDBClient(AWSConfig())

/**
 * Queries DynamoDB table for users matching given email.
 * 
 * @param {string} email - Email address to query users by
 * @returns {Object[]} Array of matched user objects
 */
const QuerySignUsers = async (email: string) => {
    console.log("QuerySignUsers invoke")
    const params = {
      TableName: dynamodbTableName,
      KeyConditionExpression: "PK = :value",
      ExpressionAttributeValues: {
        ":value": { S: email },
      },
    };
  
    const command = new QueryCommand(params);
    const results = await client.send(command);
    return results.Items;
  }



/**
 * Generates a DynamoDB item for storing a prompt.
 * 
 * @param {string} email - User email address
 * @param {string} name - User name
 * @param {string} prompt - Prompt text
 * @returns {Object} DynamoDB item object
 */
const GeneratePrompt = (email: string, name:string, prompt:string) => {
    return {
        
        PK: {S: generateSHA1(email+"|"+name+"|"+prompt).toString()},
        SK: { S: email }, // Partition key
        name: { S: name },
        prompt: { S: prompt}, // Other properties
    };
}

/**
 * Creates a prompt item in DynamoDB.
 * 
 * @param {string} email - User email address 
 * @param {string} name - User name
 * @param {string} prompt - Prompt text
 * @returns {Object} Created DynamoDB item
 */
const CreatePrompt =async (email: string, name:string, prompt :string) => {
    const item = GeneratePrompt(email, name,prompt);
    PutItem(dynamodbTableName, item);
    return dynamoDBToJSON(item);
}

/**
 * Deletes a prompt item from DynamoDB.
 * 
 * @param {string} owner - User email address 
 * @param {string} promptID - Unique ID of prompt to delete
 */
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

/**
 * Adds an item to a DynamoDB table.
 *
 * @param {string} tableName - Name of DynamoDB table
 * @param {Object} item - Item to add 
 */
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

/**
 * Queries prompts for a user email address.
 * 
 * @param {string} email - User email address to query prompts for
 * @returns {Object[]} Array of matched prompt objects
 */
const QueryPrompt = async (email: string) => {
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

/**
 * Queries prompts by partition key.
 *
 * @param {string} pk - Partition key value to query 
 * @returns {Object[]} Array of matched prompt objects
 */ 
const QueryPromptByPK = async (pk: string) => {
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

const UpdateUser = async (email: string, password: string) => {
    const hashedPassword = sha256(password).toString()
    const updateCommand = new UpdateItemCommand({
        TableName: dynamodbTableName,
        Key: {
            PK: { S: email },
            SK: { S: "#ACC"}
        },
        UpdateExpression: "set #password = :password",
        ExpressionAttributeNames: {
            "#password": "password"
        },
        ExpressionAttributeValues: {
            ":password": { S:  hashedPassword}
        }
    });

    try {
        await client.send(updateCommand);
        console.log(`Success - ${password} item updated`);
    } catch (error) {
        console.error("Error - failed to update item:", error);
    }
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



export { QuerySignUsers, PutItem, dynamoDBToJSON,UpdateUser, CreatePrompt,QueryPrompt,DeletePrompt ,QueryPromptByPK }