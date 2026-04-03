FROM oven/bun:1.3.11-slim AS builder
WORKDIR /app
COPY package.json bun.lock ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install --frozen-lockfile
COPY src/ ./src/
RUN bun build src/index.ts --outfile dist/index.js --target bun --external playwright

FROM oven/bun:1.3.11-slim AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN bun install --frozen-lockfile --production

FROM mcr.microsoft.com/playwright:v1.59.1-noble AS runner
WORKDIR /app
COPY --from=oven/bun:1.3.11-slim /usr/local/bin/bun /usr/local/bin/bun
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 8081
ENV NODE_ENV=production
CMD ["bun", "dist/index.js"]
