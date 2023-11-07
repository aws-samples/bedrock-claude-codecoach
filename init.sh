#!/bin/sh

set -x

init(){
  cd ~
  yum install -y git nodejs.x86_64 docker jq
  npm install yarn -g
  systemctl start docker

  python3 -m venv .venv
  . .venv/bin/activate
  pip install docker-compose >/dev/null 2>&1
  aws --version >/dev/null 2>&1
  if [ $? -eq 1 ]; then
  	# install aws cli
  	curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  	unzip awscliv2.zip
  	./aws/install --update
  	rm -fr /usr/bin/aws && ln -s /usr/local/bin/aws /usr/bin/aws
  	rm -fr awscliv2.zip ./aws
  fi

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
  aws dynamodb list-tables | grep "${table_name}" >/dev/null 2>&1
  if [ $? -eq 1 ]; then
      aws dynamodb create-table \
          --table-name bedrock-claude-codecoach-users \
          --attribute-definitions \
              AttributeName=email,AttributeType=S \
          --key-schema \
              AttributeName=email,KeyType=HASH \
          --provisioned-throughput \
              ReadCapacityUnits=5,WriteCapacityUnits=5
  fi
  password_hash=$(echo -n $password | openssl dgst -sha1 -hex | sed 's/^.* //')
  role=$(expr ${role} == "admin"?"admin":"guest")
  aws dynamodb put-item \
      --table-name bedrock-claude-codecoach-users \
      --item \
          "{\"email\": {\"S\": \"${email}\"}, \"password\": {\"S\": \"${password_hash}\"}, \"role\": {\"S\": \"${role}\"}}"

}

# build bedrock-claude-codecoach docker image
build_image(){
  if [ ! -d ~/bedrock-claude-codecoach ];then
    cd ~
    git clone https://github.com/aws-samples/bedrock-claude-codecoach
  fi
  cd ~/bedrock-claude-codecoach
  # use env configuration
  mv .env.sample .env.local
  # set default region
  sed -i '/^NEXT_PUBLIC_AWS_REGION/d' .env.local
  echo "NEXT_PUBLIC_AWS_REGION=\"$(aws configure get default.region)\"" >> .env.local
  docker build -t codecoach .
}

start(){
 . ~/.venv/bin/activate
 cd ~/bedrock-claude-codecoach &&  docker-compose up -d
}

stop(){
 . ~/.venv/bin/activate
 cd ~/bedrock-claude-codecoach &&  docker-compose down
}

add_runtime(){
  runtime=$1
  cd ~
  if [ ! -d ./piston ];then
    git clone 'https://github.com/engineer-man/piston.git'
    cd piston/cli && npm i
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
  if [ x"$1" = x ]; then
    init
    build_image
    add_users "admin@demo.com" "123456!@#" "admin"
    add_users "guest@demo.com" "123456" "guest"
    start
    sleep 10s
    add_runtime python=3.10.0
    add_runtime node
    add_runtime go
    add_runtime php
    add_runtime typescript
  elif [ "$1" == "start" ];then
    start
  elif [ "$1" == "stop" ];then
    stop
  elif [ "$1" == "add_runtime" ];then
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





