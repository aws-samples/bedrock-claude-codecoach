


import { BedrockClient,AWSConfig } from '@utils/aws';

import { PromptTemplate } from "@langchain/core/prompts";

interface AuthProps {
  authType?: string;
  akValue?: string;
  skValue?: string;
  awsRegionValue?: string;
}

/**
 * Retrieves the chat response from the model and writes it to the provided writer.
 * @param {string} authType - The authentication type.
 * @param {string} query  - The user's query.
 * @param {WritableStreamDefaultWriter} writer  - The writable stream to write the chat response.
 * @param {PromptTemplate} promptTemplate - Prompt template generate prompt to LLM.
 */
const GetCompletion = async (role: string, query: string, history: unknown, writer: WritableStreamDefaultWriter,promptTemplate:PromptTemplate) => {
    try {

      const historyString = JSON.stringify(history)      
      const formattedPrompt = await promptTemplate.format({
        historyString: historyString,
        query
      });
  
      const payload = {
        "prompt": role === "RAW" ? query : formattedPrompt,
        "max_tokens_to_sample": 2048,
        "temperature": 0.2,
        "top_p": 0.9,
      }
  
      console.log(payload)
      
      const client = new BedrockClient(AWSConfig());
      const response =await client.invokeModelWithStream(payload,"anthropic.claude-v2")
  
      const chunks: Uint8Array[] = [];
  
  
      let costChar=formattedPrompt.length
  
  
      if (response.body) {
        for await (const item of response.body) {
          if (item.chunk?.bytes) {
            chunks.push(item.chunk.bytes);
            await writer.ready;
            const { completion } = JSON.parse(Buffer.concat([item.chunk.bytes]).toString('utf-8'));
            costChar=costChar+completion.length
            await writer.write(completion);
  
          }
  
        }
        await writer.write(`\n
        \n &nbsp;
        `)
   
        await writer.write("\n<quota>{\"cost\":"+ costChar+",\"input\":"+formattedPrompt.length+",\"output\":"+(costChar-formattedPrompt.length)+"}</quota>")
  
  
        writer.close();
        return;
      }
  
    } catch (error) {
      console.error('Error retrieving caller identity:', error);
      writer.write(`Error retrieving caller identity , auth faild`)
      return
    }
  };
  
  


export {GetCompletion}