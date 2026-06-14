# ExtractPilot Frontend

Standalone Next.js dashboard. **No turborepo.**

## Run

```bash
cp .env.example .env
# API_URL=http://localhost:3002

bun install
bun run dev
```

App: http://localhost:3000

## Deploy

Vercel — set `API_URL` and `NEXT_PUBLIC_API_URL` to your backend URL.

See [docs/DEPLOY-SPLIT.md](./docs/DEPLOY-SPLIT.md).
