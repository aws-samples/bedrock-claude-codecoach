# Bedrock Claude CodeCoach



This repository is a sample code coach(include code interpreter ) using the Anthropic company's LLM [Claude 2](https://www.anthropic.com/index/claude-2), one of the foundational models provided by [Amazon Bedrock](https://aws.amazon.com/bedrock/) for generative AI. This sample is an innovative tool designed to assist developers in writing efficient and high-quality code .



## Architecture

It's an architecture built on AWS managed services, eliminating the need for infrastructure management. Utilizing Amazon Bedrock, there's no need to communicate with APIs outside of AWS. This enables deploying scalable, reliable, and secure applications.

- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/): NoSQL database for user auth information storage
- [Amazon Bedrock](https://aws.amazon.com/bedrock/): Managed service to utilize foundational models via APIs
- [Amazon CloudFront](https://aws.amazon.com/cloudfront/) + [S3](https://aws.amazon.com/s3/): Frontend application delivery ([React](https://react.dev/), [Chakra UI](https://chakra-ui.com/))
- [Piston](https://github.com/engineer-man/piston) : code runtime
- [Amazon EC2](https://aws.amazon.com/ec2/)
- [Amazon Javascript sdk v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)





## Demo

https://github.com/aws-samples/bedrock-claude-codecoach/assets/6694421/d63928ff-3d10-4cba-b110-5e1b3d46d2c5




## Features and Roadmap

- [x] Authentication (Sign-up, Sign-in)

- [x] IAM Role, AK/SK, Cognito identity support  

- [ ] Docker Image 

- [ ] Docker Compose deploy file

- [x] Export chat history 

- [x] Syntax highlighting for code

- [x] Rendering of Markdown'

- [x] Streaming Response

- [x] Python runtime support 

- [x] PHP runtime support 

- [x] golang runtime support 

- [x] "How to fix " support

- [ ] CDN support 

- [ ] ECS support 

- [ ] Install script 

- [ ] Cloudfromation/ CDK deployment script

  


## Deployment


1. Require: Amazon Bedrock Claude and DynamoDB access permession.
2. Launch EC2 instance ,  amazon linux 2023, m5.large, security group open 3000 ,  craete IAM Role for it that need DynamoDB and Bedrock Access permession.
3. Create a DynamoDB table with the default table name "bedrock-claude-codecoach-users". The   password needs to be sha1 encoded, any  you can use some online tools such as  https://codebeautify.org/sha1-hash-generator to generate it. 
   ```bash
   aws dynamodb create-table \
       --table-name bedrock-claude-codecoach-users \
       --attribute-definitions \
           AttributeName=email,AttributeType=S \
       --key-schema \
           AttributeName=email,KeyType=HASH \
       --provisioned-throughput \
           ReadCapacityUnits=5,WriteCapacityUnits=5
   
   #change your password
   aws dynamodb put-item \
       --table-name bedrock-claude-codecoach-users \
       --item \
           '{"email": {"S": "steven@demo.com"}, "password": {"S": "<your password>"}, "role": {"S": "admin"}}'
           
   aws dynamodb put-item \
       --table-name bedrock-claude-codecoach-users \
       --item \
           '{"email": {"S": "jack@demo.com"}, "password": {"S": "<your password>"}, "role": {"S": "guest"}}'
   ```



4. install nodejs, yarn ,docker 

   ```bash
    sudo yum install nodejs.x86_64 git docker -y
    sudo npm install yarn -g
    sudo systemctl start docker
    sudo usermod -aG docker ec2-user  #need relogin 
   
    cd ~
    python3 -m venv .venv
    . .venv/bin/activate
    pip install docker-compose
   
    git clone https://github.com/aws-samples/bedrock-claude-codecoach.git
   
    cd bedrock-claude-codecoach
    
    docker build -t codecoach .
    
    docker-compose up -d 
   
   ```

5. install piston language runtime

   ```
   cd ~
   git clone https://github.com/engineer-man/piston.git
   cd piston/cli && yarn && cd ../
   
   #install 
   cli/index.js --piston-url http://127.0.0.1:2000  ppman install python=3.10.0
   cli/index.js --piston-url http://127.0.0.1:2000  ppman install node
   cli/index.js --piston-url http://127.0.0.1:2000  ppman install go
   cli/index.js --piston-url http://127.0.0.1:2000  ppman install php
   cli/index.js --piston-url http://127.0.0.1:2000  ppman install typescript
   
   ```



6. Access CodeCoach

   ```
   http://<ec2>:3000
   ```



## Tips

- How to set up authentication? There are two roles for the user: the admin role uses EC2 IAM Role, and the guest can set up their own bedrock AK/SK and Cognito Identity Pool. All information is only saved locally, so if you refresh the browser, you need to set it up again.

  

## Authors

- [Su Wei](https://github.com/stevensu1977)
- [Tang QingYuan](https://github.com/qingyuan18)
- [Gao Yu](https://github.com/GlockGao)
- [Yan Jun](https://github.com/yanjun-ios)

