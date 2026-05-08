# syntax=docker/dockerfile:1.7

# -- build --------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Bake the daemon URL into the build so client-side fetches resolve to it.
ARG NEXT_PUBLIC_CUSTOS_DAEMON_URL=https://custos-daemon.up.railway.app
ENV NEXT_PUBLIC_CUSTOS_DAEMON_URL=$NEXT_PUBLIC_CUSTOS_DAEMON_URL

RUN npm run build

# -- runtime ------------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

USER node

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static     ./.next/static
COPY --from=build --chown=node:node /app/public           ./public

EXPOSE 3000
CMD ["node", "server.js"]
