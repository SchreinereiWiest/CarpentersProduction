# =========================================
# Stage: Development (Node.js Backend)
# =========================================

ARG PNPM_VERSION=12.4.1

FROM ghcr.io/pnpm/pnpm:${PNPM_VERSION} AS dev

RUN pnpm runtime set node 22.23.2 -g

WORKDIR /app

# Package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm approve-builds @prisma/client @prisma/engines bcrypt esbuild prisma msgpackr-extract workerd
RUN pnpm install

# Prisma
COPY prisma ./prisma
RUN pnpm exec prisma generate

# Application
COPY . .

EXPOSE 5000

CMD ["pnpm", "run", "start"]