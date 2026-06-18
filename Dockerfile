FROM --platform=$BUILDPLATFORM oven/bun:1.3.14-slim AS builder
WORKDIR /app
COPY package.json bun.lock ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install --frozen-lockfile
COPY src/ ./src/
RUN bun build src/index.ts --outfile dist/index.js --target bun --external playwright

FROM oven/bun:1.3.14-slim AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install --frozen-lockfile --production

FROM mcr.microsoft.com/playwright:v1.60.0-noble AS runner
WORKDIR /app
COPY --from=oven/bun:1.3.14-slim /usr/local/bin/bun /usr/local/bin/bun
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 8081
ENV NODE_ENV=production
ENV YOUTUBE_REMOTE_LOGIN_HEADLESS=false
ENV YOUTUBE_REMOTE_LOGIN_DISABLE_AUTOMATION_CONTROLLED=true
CMD ["xvfb-run", "-a", "-s", "-screen 0 1920x1080x24", "bun", "dist/index.js"]
