# ExtractPilot Backend

Standalone Bun API + worker. **No turborepo.**

## Run

```bash
cp .env.example .env
bun install
bun run db:push
bun run dev
```

- API: http://localhost:3002
- Swagger: http://localhost:3002/api/docs

## Structure

```
src/           ← API + cron + auth + REST
src/worker/    ← BullMQ email processing
packages/      ← internal modules (@repo/* via file: deps)
```

## Deploy

See [docs/DEPLOY-SPLIT.md](./docs/DEPLOY-SPLIT.md) — Render + Neon + Upstash.
