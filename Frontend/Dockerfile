# =========================================
# Development - Vite React App
# =========================================

ARG PNPM_VERSION=12.4.1

FROM ghcr.io/pnpm/pnpm:${PNPM_VERSION}

# Node 22
RUN pnpm runtime set node 22.23.2 -g

WORKDIR /app


# -----------------------------------------
# Dependencies
# -----------------------------------------

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm approve-builds core-js
RUN pnpm install
RUN pnpm approve-builds core-js

# -----------------------------------------
# Application
# -----------------------------------------

COPY . .
RUN pnpm approve-builds core-js
RUN pnpm run build

# -----------------------------------------
# Vite
# -----------------------------------------

EXPOSE 5173

CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]
