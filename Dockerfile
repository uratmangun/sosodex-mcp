FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* are inlined at build time — pass via --build-arg (see deploy/push-image-to-vps.sh).
ARG NEXT_PUBLIC_POSTHOG_TOKEN=build-placeholder-posthog-token
ARG BETTER_AUTH_URL=https://sosodex.uratmangun.ovh
ARG NEXT_PUBLIC_MCP_APP_ORIGIN=https://sosodex.uratmangun.ovh
# Placeholders only for `next build` page-data collection (.dockerignore excludes .env*).
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-32chars
ENV BETTER_AUTH_URL=${BETTER_AUTH_URL}
ENV NEXT_PUBLIC_MCP_APP_ORIGIN=${NEXT_PUBLIC_MCP_APP_ORIGIN}
ENV NEXT_PUBLIC_POSTHOG_TOKEN=${NEXT_PUBLIC_POSTHOG_TOKEN}
ENV NEXT_PUBLIC_POSTHOG_HOST=/ingest
ENV NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com
ENV GOOGLE_CLIENT_ID=build-placeholder
ENV GOOGLE_CLIENT_SECRET=build-placeholder
ENV SOSOVALUE_API_KEY=build-placeholder
RUN corepack enable && pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist/client ./dist/client
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
