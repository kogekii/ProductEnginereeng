FROM node:24-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS build

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate

COPY index.html vite.config.ts tsconfig.json tsconfig.server.json ./
COPY src ./src

RUN pnpm build
RUN pnpm prune --prod

FROM base AS runtime

ENV NODE_ENV=production \
    DEMO_MODE=false \
    PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma

RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node

EXPOSE 3000

CMD ["node", "dist/server/server/server.js"]
