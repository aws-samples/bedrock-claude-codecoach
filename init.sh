#!/bin/sh

set -e

init(){
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
}

add_users(){
  email=$1
  password=$2
  role=$3
  table_name="bedrock-claude-codecoach-users"
  table_exists=$(aws dynamodb list-tables --query "contains(${table_name})" --output text)
  if [ "$table_exists" == "False" ]; then
      aws dynamodb create-table \
          --table-name bedrock-claude-codecoach-users \
          --attribute-definitions \
              AttributeName=email,AttributeType=S \
          --key-schema \
              AttributeName=email,KeyType=HASH \
          --provisioned-throughput \
              ReadCapacityUnits=5,WriteCapacityUnits=5
  fi
  password_hash = $(echo -n $password | openssl dgst -sha1 -hex | sed 's/^.* //')
  role=$(expr ${role} == "admin"?"admin":"guest")
  aws dynamodb put-item \
      --table-name bedrock-claude-codecoach-users \
      --item \
          "{\"email\": {\"S\": \"${email}\"}, \"password\": {\"S\": \"${password_hash}\"}, \"role\": {\"S\": \"${role}\"}}"
}

# build bedrock-claude-codecoach docker image
build_image(){
  cd ~
  git clone https://github.com/aws-samples/bedrock-claude-codecoach
  cd bedrock-claude-codecoach
  # use env configuration
  cp .env.sample .env.local
  # set default region
  echo "NEXT_PUBLIC_AWS_REGION=\"$(aws configure get default.region)\"" >> .env.local
  docker build -t codecoach .
}

start(){
  docker-compose up -d
}

stop(){
  docker-compose down
}

add_runtime(){
  runtime=$1
  cd ~
  if [ ! -d "./piston" ]; then
    git clone https://github.com/engineer-man/piston.git "$piston_dir"
    cd cli && npm i && cd -
  fi

  cd ~/piston
  if $(curl -s http://127.0.0.1:2000 | grep -q "Piston");then
    cli/index.js --piston-url http://127.0.0.1:2000  ppman install $runtime
  else
    echo "add runtime failed, piston service not running"
    exit 1
  fi

}

main() {
  if [ $# -eq 0 ]; then
    init
    build_image
    add_users "admin@demo.com" "123456!@#" "admin"
    add_users "guest@demo.com" "123456" "guest"
    start
    add_runtime python=3.10.0
    add_runtime node
    add_runtime go
    add_runtime php
    add_runtime typescript
  fi

  if [ $1 == "start" ]; then
    start
  elif [ $1 == "stop" ]; then
    stop
  elif [ $1 == "add_runtime" ];then
    add_runtime $2 $3
  else
    echo "无效的参数 $1"
    exit 1
  fi

}

if [ "$(id -u)" != "0" ]; then
   echo "please run the script with root user,you can run (sudo su -) to swich to root" 1>&2
   exit 1
fi

main "$1" "$2" "$3"





