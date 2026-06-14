FROM oven/bun:1.2.14
WORKDIR /app
COPY package.json bun.lock tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY packages ./packages
COPY scripts ./scripts
RUN bun install --frozen-lockfile
ENV NODE_ENV=production
EXPOSE 3002
CMD ["bun", "src/index.ts"]
