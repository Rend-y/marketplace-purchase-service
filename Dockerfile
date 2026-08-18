# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13-alpine

# ---------- deps: production-only dependencies ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

# ---------- build: full dependencies + compilation ----------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    APP_PORT=3000 \
    NODE_OPTIONS="--enable-source-maps"

RUN apk add --no-cache dumb-init

COPY --chown=node:node package.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node
EXPOSE 3000

# dumb-init forwards SIGTERM to node so the graceful shutdown hooks actually run
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
