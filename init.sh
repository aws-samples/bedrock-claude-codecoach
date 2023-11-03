#!/bin/sh

set -x

sudo su -

# 1.检查和安装基础环境(git node1.18+ docker docker-compose awscli)
yum install -y git nodejs.x86_64 docker jq
npm install yarn -g
systemctl start docker

python3 -m venv .venv
. .venv/bin/activate
pip install docker-compose

# install aws cli
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -fr /usr/bin/aws && ln -s /usr/local/bin/aws /usr/bin/aws

# set default region
TOKEN=`curl -X PUT -s "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
export AWS_REGION=$(curl -s 169.254.169.254/latest/dynamic/instance-identity/document -H "X-aws-ec2-metadata-token: $TOKEN" | jq -r '.region')
aws configure set default.region ${AWS_REGION}
aws configure get default.region

# pass the role to docker
instance_id=$(TOKEN=`curl -X PUT -s "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` && curl -H "X-aws-ec2-metadata-token: $TOKEN" -s  http://169.254.169.254/latest/meta-data/instance-id)

aws ec2 modify-instance-metadata-options \
    --instance-id $instance_id \
    --http-put-response-hop-limit 2 \
    --http-endpoint enabled

# 2.初始化ddb表，并初始化用户
ADMIN_PASSWORD='123456!@#'
GUEST_PASSWORD='123456'
ADMIN_PASSWORD_HASH= $(echo -n $ADMIN_PASSWORD | openssl dgst -sha1 -hex | sed 's/^.* //')
GUEST_PASSWORD_HASH= $(echo -n $GUEST_PASSWORD | openssl dgst -sha1 -hex | sed 's/^.* //')

aws dynamodb create-table \
    --table-name bedrock-claude-codecoach-users \
    --attribute-definitions \
        AttributeName=email,AttributeType=S \
    --key-schema \
        AttributeName=email,KeyType=HASH \
    --provisioned-throughput \
        ReadCapacityUnits=5,WriteCapacityUnits=5

aws dynamodb put-item \
    --table-name bedrock-claude-codecoach-users \
    --item \
        "{\"email\": {\"S\": \"admin@demo.com\"}, \"password\": {\"S\": \"${ADMIN_PASSWORD_HASH}\"}, \"role\": {\"S\": \"admin\"}}"

aws dynamodb put-item \
    --table-name bedrock-claude-codecoach-users \
    --item \
        "{\"email\": {\"S\": \"guest@demo.com\"}, \"password\": {\"S\": \"${GUEST_PASSWORD_HASH}\"}, \"role\": {\"S\": \"guest\"}}"


# 3.构建codecoach镜像
git clone https://github.com/aws-samples/bedrock-claude-codecoach

cd bedrock-claude-codecoach
cp .env.sample .env.local

echo "NEXT_PUBLIC_AWS_REGION=\"$(aws configure get default.region)\"" >> .env.local

docker build -t codecoach .

docker-compose up -d

# 4.安装piston环境
cd ~
git clone https://github.com/engineer-man/piston.git
# Install all the dependencies for the cli
cd cli && npm i && cd -

#install
cli/index.js --piston-url http://127.0.0.1:2000  ppman install python=3.10.0
cli/index.js --piston-url http://127.0.0.1:2000  ppman install node
cli/index.js --piston-url http://127.0.0.1:2000  ppman install go
cli/index.js --piston-url http://127.0.0.1:2000  ppman install php
cli/index.js --piston-url http://127.0.0.1:2000  ppman install typescript

# 5.接口检查
curl -s  http://127.0.0.1:2000/api/v2/runtimes | jq .[].language

curl -X POST http://127.0.0.1:3000/api/signin -d'{"email": "admin@demo.com","password": "123456"}'



