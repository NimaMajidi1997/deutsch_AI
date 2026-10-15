# deutschAI website: small image with code and cards only. Media is bind-mounted at runtime
# to /app/content/media (see docs/deployment.md).

# Stage 1: build
FROM node:24-alpine AS builder
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
COPY content/cards ../content/cards
RUN mkdir -p public && npm run build

# Stage 2: runtime
FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app/web
COPY --from=builder --chown=node:node /app/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/web/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/web/public ./public
COPY --chown=node:node content/cards ../content/cards
RUN mkdir -p ../content/media
# Fail the build if image optimization would silently fall back to full-size PNGs.
RUN node -e "require('sharp')"
USER node
EXPOSE 3000
CMD ["node", "server.js"]
