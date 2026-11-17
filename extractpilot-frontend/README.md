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

Vercel — set only `API_URL` to your backend URL (e.g. `https://extractpilot-api.revilen.com`).

See [docs/DEPLOY-SPLIT.md](./docs/DEPLOY-SPLIT.md).
