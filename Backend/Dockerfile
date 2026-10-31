# =========================================
# Stage: Development (Node.js Backend)
# =========================================

ARG PNPM_VERSION=12.15.0

FROM ghcr.io/pnpm/pnpm:${PNPM_VERSION} AS dev

RUN pnpm runtime set node 22.23.4 -g

WORKDIR /app

# Package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm approve-builds @prisma/client @prisma/engines bcrypt esbuild prisma msgpackr-extract workerd
RUN pnpm install

# Prisma
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Application
COPY --from=engine . /Engine
COPY . .

# Generate after copying the application so a locally generated, stale client
# can never overwrite the client that belongs to the copied Prisma schema.
RUN pnpm exec prisma generate

EXPOSE 5000

CMD ["pnpm", "run", "start"]
