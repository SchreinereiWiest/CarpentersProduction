# syntax=docker/dockerfile:1

ARG PNPM_VERSION=12.4.1
ARG NODE_VERSION=22.23.2

FROM ghcr.io/pnpm/pnpm:${PNPM_VERSION} AS build

ARG NODE_VERSION
RUN pnpm runtime set node "${NODE_VERSION}" -g

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY --from=engine . /Engine
COPY . .
RUN pnpm run build

FROM nginxinc/nginx-unprivileged:stable-alpine AS production

COPY --chown=33:33 nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=33:33 /app/dist/ /usr/share/nginx/html/

# The Kubernetes deployment runs both containers as www-data (UID/GID 33).
# Nginx stores its PID and temporary data below /dev/shm, which remains writable
# when the container root filesystem is read-only.
USER 33:33

EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
