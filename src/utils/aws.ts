import { BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime"; // ES Modules import
import { STS } from "@aws-sdk/client-sts";


const AWSRegion = process.env.AWS_REGION ?? 'us-west-2'
const DefaultLLMModel=process.env.DEFAULT_LLM_MODEL ??"anthropic.claude-3-sonnet-20240229-v1:0"


interface AWSConfigWithCredentials {
  region: string
  credentials: {
    accessKeyId: string
    secretAccessKey: string
  }
}

interface AWSConfigWithRegionOnly {
  region: string
}

type AWSConfigReturnType = AWSConfigWithCredentials | AWSConfigWithRegionOnly;

interface AuthProps {
  authType?: string;
  akValue?: string;
  skValue?: string;
  awsRegionValue?: string;
}





/**
 * Generates the configuration object for AWS SDK based on the authentication type.
 *
 * @returns {AWSConfigReturnType} The AWS configuration object with either credentials or just the region.
 */
const AWSConfig = (): AWSConfigReturnType => {
   
    return {
      region: AWSRegion,
    }
}




class STSClient {
  client: STS;
  
  constructor(config:AWSConfigReturnType) {
    this.client = new STS(config); 
  }

  async getCallerIdentity() {
    return this.client.getCallerIdentity({});
  }
}



class BedrockClient {
  client: BedrockRuntimeClient;
  
  constructor(config:AWSConfigReturnType) {
    this.client = new BedrockRuntimeClient(config); 
  }

  async invokeModelWithStream(payload, modelId:string) {
    const input = {
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
      modelId
    };

    const command = new InvokeModelWithResponseStreamCommand(input);
    return this.client.send(command);
  }
}


export { AWSConfig, BedrockClient, STSClient,AWSRegion,DefaultLLMModel };

export type { AuthProps };

