#!/usr/bin/env bash

set -Eeuo pipefail

readonly project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly registry="ghcr.io/schreinereiwiest/carpentersproduction"
readonly frontend_image="${registry}/frontend:latest"
readonly backend_image="${registry}/backend:latest"

cd "${project_root}"

docker buildx build \
  --build-context engine=./Engine \
  --load \
  --file Frontend/Dockerfile.dev \
  --tag "${frontend_image}" \
  ./Frontend

docker buildx build \
  --build-context engine=./Engine \
  --load \
  --file Backend/Dockerfile.dev \
  --tag "${backend_image}" \
  ./Backend

docker push "${backend_image}"
docker push "${frontend_image}"
