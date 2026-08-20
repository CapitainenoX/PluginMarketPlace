# Multi-stage build for web-node (Next.js standalone output). Build context
# must be the repo root, e.g.:
#   docker build -f deploy/docker/web-node.Dockerfile -t mcmarket-web .
#
# Requires web-node/next.config.ts to set `output: "standalone"` — without
# it, `.next/standalone` won't exist and the final COPY below fails.

FROM node:20-alpine AS deps
WORKDIR /src
COPY web-node/package.json web-node/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /src
COPY --from=deps /src/node_modules ./node_modules
COPY web-node/ .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /src/public ./public
COPY --from=build /src/.next/standalone ./
COPY --from=build /src/.next/static ./.next/static
EXPOSE 3000
ENV PORT=3000
ENTRYPOINT ["node", "server.js"]
