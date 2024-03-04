


import { BedrockClient, AWSConfig} from '@utils/aws';

import { PromptTemplate } from "@langchain/core/prompts";


/**
 * Generate the payload for calling the AI model
 * @param {string} model - The name of the AI model to use 
 * @param {string} prompt - The prompt text to send to the AI model
 * @returns {Object} - The payload object
 */
const generatePayload = (model: string, prompt: string) => {

  // Create the default payload
  const defaultPayload = {
    prompt,
    max_tokens_to_sample: 2048,
    temperature: 0.2,
    top_p: 0.9,
  };

  // Check if model name contains "mistral"
  if (model.indexOf("mistral") > -1) {

    // Return payload for Mistral model
    return {
      prompt,
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 2048
    };

  } else {

    // Return default payload 
    return defaultPayload;

  }
};


/**
* Get AI chat completion response and write to provided writer stream.
* 
* @param {string} model - Name of AI model to call
* @param {string} role - User role type (RAW or ASSISTANT) 
* @param {string} query - User query text 
* @param {object} history - Chat history context 
* @param {WritableStreamDefaultWriter} writer - Writable stream to write response 
* @param {PromptTemplate} promptTemplate - Template to format prompt for model 
*/
const getCompletion = async (model: string, role: string, query: string, history, writer, promptTemplate) => {

  try {
    // Stringify history for prompt
    const historyString = JSON.stringify(history);

    // Format prompt based on role  
    let prompt;
    if (role === 'RAW') {
      prompt = query;
    } else {
      prompt = await promptTemplate.format({
        historyString,
        query
      });
    }

    // Check if Mistral model
    const isMistral = model.indexOf('mistral') > -1;

    if(isMistral){
      prompt = query;
    }

    // Generate payload
    const payload = generatePayload(model, prompt);

    // Log for debugging
    console.log(role, model, payload);


    // Call model
    const client = new BedrockClient(AWSConfig());
    const response = await client.invokeModelWithStream(payload, model);

    // Handle Mistral vs Claude2 responses
    if (response.body) {
      await writer.ready;

      for await (const item of response.body) {
        if (item.chunk?.bytes) {

          // Mistral model
          if (isMistral) {
            const { outputs } = JSON.parse(Buffer.concat([item.chunk.bytes]).toString('utf-8'));
            const { text } = outputs[0];
            await writer.write(text);

            // Claude2 model  
          } else {
            const { completion } = JSON.parse(Buffer.concat([item.chunk.bytes]).toString('utf-8'));
            await writer.write(completion);
          }

        }
      }

      // Add newline after response
      await writer.write(`\n\n &nbsp;`);

      // Close writer
      writer.close();

    } else {
      // Handle errors
      console.error('Error invoking model:', model);
      await writer.write('Error invoking model');
    }


  } catch (error) {
    console.error('Error retrieving caller identity or invoke model :', error);
    await writer.write(`ERROR: retrieving caller identity auth faild or invoke ${model} failed ! `)
    return
  }
};




export { getCompletion }