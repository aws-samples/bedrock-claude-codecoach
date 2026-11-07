#!/bin/bash
set -euo pipefail
umask 077

if [ "$(id -u)" != 0 ]; then
  echo "Run this script as root." >&2
  exit 1
fi
cd "$(dirname "$(readlink -f "$0")")"
if [ -f .env.executor ]; then
  echo "Refusing to install the application on an executor host." >&2
  exit 1
fi

configure() {
  : "${AWS_REGION:?Set AWS_REGION}"
  : "${DDB_TABLE:?Create/select the application table and set DDB_TABLE}"
  # Keep the signing key stable on restart; it is never added to the image.
  if [ -z "${AUTH_SECRET:-}" ] && [ -f .env.local ]; then
    AUTH_SECRET=$(sed -n 's/^AUTH_SECRET="\([^"]*\)"$/\1/p' .env.local)
  fi
  AUTH_SECRET=${AUTH_SECRET:-$(openssl rand -hex 32)}
  if [ "${#AUTH_SECRET}" -lt 32 ]; then
    echo "AUTH_SECRET must be at least 32 bytes." >&2
    exit 1
  fi
  cat > .env.local <<EOF
AUTH_SECRET="$AUTH_SECRET"
AWS_REGION="$AWS_REGION"
DDB_TABLE="$DDB_TABLE"
ENABLE_CODE_EXECUTION="${ENABLE_CODE_EXECUTION:-false}"
PISTON_SERVER_URL="${PISTON_SERVER_URL:-}"
APP_BIND_ADDRESS="${APP_BIND_ADDRESS:-127.0.0.1}"
EOF
  chmod 600 .env.local
  mkdir -p data/uploads
  chown 1001:1001 data/uploads
}

add_user() {
  local email=$1 role=${2:-admin} replace=${3:-false}
  local item credentials
  item=$(mktemp)
  credentials=$(mktemp)
  node scripts/seed-user.mjs "$email" "$role" "$item" "$credentials"
  local condition=(--condition-expression 'attribute_not_exists(PK)')
  if [ "$replace" = true ]; then condition=(); fi
  if aws dynamodb put-item --table-name "$DDB_TABLE" --item "file://$item" "${condition[@]}"; then
    mv "$credentials" /root/codecoach-credentials
    echo "Generated credentials are in /root/codecoach-credentials (root only)."
  else
    rm -f "$item" "$credentials"
    return 1
  fi
  rm -f "$item"
}

case "${1:-install}" in
  install)
    bash scripts/install-docker.sh
    yum install -y nodejs
    if ! command -v aws >/dev/null 2>&1; then
      temporary=$(mktemp -d)
      curl --fail --location https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip --output "$temporary/aws.zip"
      unzip -q "$temporary/aws.zip" -d "$temporary"
      "$temporary/aws/install" --update
      rm -rf "$temporary"
    fi
    configure
    docker compose --env-file .env.local build
    # Existing accounts are preserved. Reset known demo credentials explicitly
    # with --reset-user before reopening an upgraded deployment.
    email=${ADMIN_EMAIL:-admin@example.com}
    key=$(jq -nc --arg email "$email" '{PK:{S:$email},SK:{S:"#ACC"}}')
    existing=$(aws dynamodb get-item --consistent-read --table-name "$DDB_TABLE" --key "$key" --query 'Item.PK.S' --output text)
    if [ "$existing" = None ]; then add_user "$email" admin; fi
    docker compose --env-file .env.local up -d
    ;;
  -s) docker compose --env-file .env.local up -d ;;
  -t) docker compose --env-file .env.local down ;;
  -u|--reset-user)
    # Read the root-owned runtime configuration for operator account changes.
    set -a
    # shellcheck source=/dev/null
    source .env.local
    set +a
    replace=false
    if [ "$1" = --reset-user ]; then replace=true; fi
    add_user "${2:?Provide an email}" "${3:-admin}" "$replace"
    ;;
  *)
    echo "Usage: $0 [install|-s|-t|-u EMAIL [admin|guest]|--reset-user EMAIL [admin|guest]]" >&2
    exit 1
    ;;
esac
