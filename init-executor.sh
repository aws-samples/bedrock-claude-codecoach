#!/bin/bash
set -euo pipefail
umask 077

if [ "$(id -u)" != 0 ]; then
  echo "Run on a dedicated credential-free worker as root." >&2
  exit 1
fi
cd "$(dirname "$(readlink -f "$0")")"
# Never initialize an executor in an application checkout containing secrets.
if [ -f .env.local ]; then
  echo "Refusing to install Piston alongside the application." >&2
  exit 1
fi
bash scripts/install-docker.sh
printf 'EXECUTOR_BIND_ADDRESS=%s\n' "${EXECUTOR_BIND_ADDRESS:-127.0.0.1}" > .env.executor
chmod 600 .env.executor
# The CloudFormation worker has no instance profile and has IMDS disabled.
docker compose --env-file .env.executor -f docker-compose.executor.yaml up -d
ready=false
for _attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:2000/api/v2/runtimes >/dev/null; then ready=true; break; fi
  sleep 2
done
if [ "$ready" != true ]; then echo "Executor failed to start" >&2; exit 1; fi
for runtime in 'python 3.10.0' 'node 18.15.0' 'typescript 5.0.3' 'go 1.16.2' 'php 8.2.3'; do
  read -r language version <<< "$runtime"
  payload=$(jq -nc --arg language "$language" --arg version "$version" '{language:$language,version:$version}')
  curl --fail --silent --show-error --max-time 300 http://127.0.0.1:2000/api/v2/packages \
    -H 'Content-Type: application/json' --data "$payload"
done
