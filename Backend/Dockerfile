# syntax=docker/dockerfile:1

ARG PNPM_VERSION=12.15.0
ARG NODE_VERSION=22.23.4

FROM ghcr.io/pnpm/pnpm:${PNPM_VERSION} AS production

ARG NODE_VERSION
RUN pnpm runtime set node "${NODE_VERSION}" -g \
    && NODE_RUNTIME="$(find /pnpm/global -path '*/node/bin/node' -type f -print -quit)" \
    && test -n "${NODE_RUNTIME}" \
    && ln -s "${NODE_RUNTIME}" /usr/local/bin/node

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN pnpm exec prisma generate

COPY --from=engine --chown=33:33 . /Engine
COPY --chown=33:33 . .

# Avoid package-manager writes at runtime. The application itself is started
# directly with Node and only needs read access to /app and /Engine.
ENV NODE_ENV=production \
    HOME=/dev/shm \
    TMPDIR=/dev/shm \
    XDG_CACHE_HOME=/dev/shm/.cache

RUN chown -R 33:33 /app

USER 33:33

EXPOSE 5000

CMD ["/usr/local/bin/node", "src/server.js"]
