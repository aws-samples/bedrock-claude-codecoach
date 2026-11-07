#!/bin/bash
set -euo pipefail

yum install -y docker git jq openssl unzip
systemctl enable --now docker
if ! docker compose version >/dev/null 2>&1; then
  # Amazon Linux 2023 uses the CentOS-compatible compose plugin package.
  package=$(mktemp --suffix=.rpm)
  curl --fail --location --proto '=https' --tlsv1.2 \
    https://download.docker.com/linux/centos/9/x86_64/stable/Packages/docker-compose-plugin-2.39.4-1.el9.x86_64.rpm \
    --output "$package"
  yum install -y "$package"
  rm -f "$package"
fi
