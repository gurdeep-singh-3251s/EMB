# Deploy: Vercel (frontend) + Render (backend) — $0 practice stack

This guide matches **Phase 1** (stable monorepo changes) + **Phase 2** (two independent git repos).

## Architecture after split

| Service | Host | Free tier |
|---------|------|-----------|
| Frontend (Next.js) | **Vercel** | Hobby free |
| Backend (API + worker merged) | **Render** | Free web service |
| Postgres | **Neon** | Free |
| Redis | **Upstash** | Free |

Attachments are kept **7 days** by default (`ATTACHMENT_RETENTION_DAYS=7`) then deleted automatically. On Render free tier, disk is ephemeral — extracted **JSON results stay in Postgres**; only raw attachment files may be lost after redeploy. Use `ATTACHMENT_MODE=stub` for zero-cost practice.

---

## Phase 1 — Verify in monorepo (do this first)

```bash
cp .env.example .env
# Fill: DATABASE_URL, REDIS_URL, OPENROUTER_API_KEY
# Fill: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_ACCESS_SECRET
# Fill: REST_API_KEY, CLIENT_ORIGIN=http://localhost:3000, API_PUBLIC_URL=http://localhost:3002

bun install
bun run db:push
bun run dev:server   # API + worker in one process
bun run dev:web      # separate terminal
```

Open http://localhost:3000 → Sign in with Google → run pipeline.

---

## Phase 2 — Export two repos

```bash
bun scripts/exportRepos.ts
```

Creates:

- `export/extractpilot-backend/` — API + worker + packages
- `export/extractpilot-frontend/` — Next.js + UI packages

Push each folder to its own GitHub repo.

---

## Google OAuth setup (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth 2.0 Client ID** (Web application)
3. **Authorized redirect URI** (must match backend exactly):

   ```
   https://YOUR-RENDER-URL.onrender.com/api/v1/auth/google/callback
   ```

4. Copy **Client ID** → `GOOGLE_CLIENT_ID`
5. Copy **Client secret** → `GOOGLE_CLIENT_SECRET`

---

## Backend — Render (free)

1. New **Web Service** → connect `extractpilot-backend` repo
2. Runtime: **Docker** (uses root `Dockerfile`)
3. Plan: **Free**
4. Environment variables:

| Variable | Value |
|----------|-------|
| `PORT` | `3002` |
| `DATABASE_URL` | Neon connection string |
| `REDIS_URL` | Upstash rediss:// URL |
| `OPENROUTER_API_KEY` | your key |
| `REST_API_KEY` | long random secret (for REST API integrators) |
| `JWT_ACCESS_SECRET` | long random secret |
| `GOOGLE_CLIENT_ID` | from Google Console |
| `GOOGLE_CLIENT_SECRET` | from Google Console |
| `CLIENT_ORIGIN` | `https://YOUR-APP.vercel.app` |
| `API_PUBLIC_URL` | `https://YOUR-API.onrender.com` |
| `ATTACHMENT_RETENTION_DAYS` | `7` |
| `ATTACHMENT_MODE` | `stub` |
| `BETA_UNLIMITED_QUOTA` | `true` |

5. Deploy → note public URL (e.g. `https://extractpilot-api.onrender.com`)
6. Run migrations once (Render shell or locally against Neon):

   ```bash
   bun run db:push
   ```

Health check: `GET https://YOUR-API.onrender.com/health`

---

## Frontend — Vercel (free)

1. Import `extractpilot-frontend` repo
2. Framework: **Next.js**
3. Root directory: `apps/web` (or repo root if you flatten — default export keeps `apps/web`)
4. Environment variables:

| Variable | Value |
|----------|-------|
| `API_URL` | `https://YOUR-API.onrender.com` |
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com` |

5. Deploy → note URL → update Render `CLIENT_ORIGIN` to match Vercel URL

Vercel rewrites proxy `/api/v1/*` to your backend so the dashboard works without CORS issues.

---

## Smoke test after deploy

```bash
WEB_URL=https://YOUR-APP.vercel.app API_URL=https://YOUR-API.onrender.com bun run verify:deploy
```

Manual checklist:

- [ ] Sign in with Google on Vercel URL
- [ ] Create extraction query
- [ ] Connect mailbox
- [ ] Extract emails → see results
- [ ] REST with `Authorization: Bearer YOUR_REST_API_KEY`

---

## Security model

| Caller | Auth |
|--------|------|
| Dashboard (browser) | Google OAuth → JWT in localStorage |
| Your backend scripts | `REST_API_KEY` via Bearer header |
| Public | `/api/v1/plans`, `/api/v1/usage` only |

When Google OAuth is configured, the old “trusted browser origin without key” bypass is **disabled**.

---

## Free tier limits (expect these)

- **Render free**: sleeps after ~15 min idle; first request may take 30–60s to wake
- **Neon free**: 0.5 GB storage — enough for practice
- **Upstash free**: 10k commands/day — fine for beta
- **Attachments**: ephemeral on Render; retention cron keeps DB lean

---

## Rollback

Monorepo still works with `docker compose -f docker-compose.prod.yml` (3 services) if you need the old layout. The merged backend is the new default via `apps/server/src/index.ts`.
