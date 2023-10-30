
import { NextRequest,NextResponse } from 'next/server'
import { STS } from "@aws-sdk/client-sts";
import { 
  CognitoIdentityClient, 
  GetIdCommand,
  GetCredentialsForIdentityCommand 
} from "@aws-sdk/client-cognito-identity";

interface AuthProps {
  authType: string;
  akValue?:string;
  skValue?:string;
  cognitoIDValue?:string;
  cognitoRegionValue?:string;
}

const getCallerIdentity = async ({authType,akValue, skValue,cognitoIDValue,cognitoRegionValue}:AuthProps) => {
    try {
      let sts = new STS({ apiVersion: 'latest',region: "us-east-1", });
      if (authType==="AKSK"){
        sts = new STS({
          region: "us-east-1",
          credentials: {
            accessKeyId: akValue??"", 
            secretAccessKey: skValue??""
          }
        });
      }
      if (authType==="COGNITO"){
        const cognitoClient = new CognitoIdentityClient({
          region: "us-east-1",
        });
        
        const getIdCommand = new GetIdCommand({
          IdentityPoolId: cognitoIDValue
        });
        
        const idResponse = await cognitoClient.send(getIdCommand);
        
        const getCredentialsCommand = new GetCredentialsForIdentityCommand({
          IdentityId: idResponse.IdentityId!
        });
        
        const credentialsResponse = await cognitoClient.send(getCredentialsCommand);
        
        console.log(credentialsResponse.Credentials);
        const ak= credentialsResponse?.Credentials?.AccessKeyId??"";
        const sk= credentialsResponse?.Credentials?.SecretKey??"";
        const sessionToken=credentialsResponse?.Credentials?.SessionToken??"";
       

        sts = new STS({
          region: "us-east-1",
          credentials: {
            accessKeyId: ak,
            secretAccessKey: sk,
            sessionToken: sessionToken,
          }
        });
      }
      const response = await sts.getCallerIdentity({});
      return response.Arn ;
    } catch (error) {
      console.error('Error retrieving caller identity:', error);
      return ""
    }
  };
  
export async function GET(req:NextRequest){
  
  const caller= await getCallerIdentity({authType:"IAMROLE"})
  const res=NextResponse.json({"me":caller})
  return res
}


export async function POST(req: NextRequest) {
  const { authType,akValue,skValue,cognitoIDValue,cognitoRegionValue } = await req.json(); // Extract the authType from the request body
  // Perform any required logic with the authType value
  if (authType==="IAMROLE"||authType==="AKSK"||authType==="COGNITO"){
  const caller = await getCallerIdentity({authType:authType,akValue:akValue,skValue:skValue,cognitoIDValue:cognitoIDValue,cognitoRegionValue:cognitoRegionValue});
  const res = NextResponse.json({ me: caller });
  return res;
  }
  const res = NextResponse.json({ me: "" });
  return res;
  
}
