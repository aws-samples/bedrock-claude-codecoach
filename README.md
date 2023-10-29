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

Come soon ......




## Authors

- [Su Wei](https://github.com/stevensu1977)

