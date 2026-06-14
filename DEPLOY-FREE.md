# Deploy ExtractPilot for free (beta testers)

**Stack:** Vercel (frontend) + Render (backend) + Neon (DB) + Redis Cloud (queue)

You already have Neon + Redis configured locally. This gets a public URL you can share.

---

## What you need (all free)

| Service | Sign up | You have it? |
|---------|---------|--------------|
| [GitHub](https://github.com) | Free account | Create repo |
| [Render](https://render.com) | Free web service | Backend |
| [Vercel](https://vercel.com) | Hobby plan | Frontend |
| [Neon](https://neon.tech) | Postgres | ✅ in `.env` |
| [Redis Cloud](https://redis.io/cloud) | Free tier | ✅ in `.env` |
| [Google Cloud Console](https://console.cloud.google.com) | OAuth client | Add Client ID + secret |

**Expect:** Render free sleeps after ~15 min idle. First visit may take 30–60s to wake.

---

## Step 1 — Push code to GitHub

One repo with both folders is fine.

```powershell
cd "d:\New folder (7)"
git init
git add README.md extractpilot-backend extractpilot-frontend
git commit -m "Initial ExtractPilot deploy"
```

Create a new **empty** repo on GitHub (no README), then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/extractpilot.git
git branch -M main
git push -u origin main
```

**Never commit `.env` files** — they are gitignored.

---

## Step 2 — Deploy backend on Render

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name:** `extractpilot-api`
   - **Root directory:** `extractpilot-backend`
   - **Runtime:** Docker
   - **Plan:** Free
   - **Health check path:** `/health`
4. Add environment variables (copy values from your local `.env`, **not** localhost URLs):

| Variable | Production value |
|----------|------------------|
| `PORT` | `3002` |
| `DATABASE_URL` | your Neon URL |
| `REDIS_URL` | your Redis URL |
| `OPENROUTER_API_KEY` | your key |
| `GOOGLE_CLIENT_ID` | from Google (step 4) |
| `GOOGLE_CLIENT_SECRET` | from Google |
| `JWT_ACCESS_SECRET` | long random string |
| `JWT_REFRESH_SECRET` | long random string |
| `REST_API_KEY` | long random string (for REST API) |
| `CLIENT_ORIGIN` | `https://YOUR-APP.vercel.app` (update after step 3) |
| `API_PUBLIC_URL` | `https://extractpilot-api.onrender.com` (your Render URL) |
| `BETA_INVITE_ONLY` | `true` |
| `BETA_UNLIMITED_QUOTA` | `true` |
| `ENABLE_BILLING` | `false` |
| `ATTACHMENT_MODE` | `stub` |
| `ATTACHMENT_RETENTION_DAYS` | `7` |
| `ENABLE_CRON` | `false` |

5. **Deploy** → copy your Render URL (e.g. `https://extractpilot-api.onrender.com`)
6. Test: open `https://YOUR-API.onrender.com/health` → should return JSON OK

Database schema: already pushed if you ran `bun run db:push` locally against Neon. Re-run locally if needed:

```powershell
cd extractpilot-backend
bun run db:push
```

---

## Step 3 — Deploy frontend on Vercel

1. [Vercel Dashboard](https://vercel.com/new) → Import GitHub repo
2. Settings:
   - **Root directory:** `extractpilot-frontend`
   - **Framework:** Next.js
3. Environment variables:

| Variable | Value |
|----------|-------|
| `API_URL` | `https://YOUR-API.onrender.com` |
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com` |

4. **Deploy** → copy Vercel URL (e.g. `https://extractpilot.vercel.app`)

---

## Step 4 — Google OAuth (required for login)

Google Cloud → **APIs & Services** → **Credentials** → OAuth 2.0 Client ID (Web):

**Authorized JavaScript origins:**
```
https://YOUR-APP.vercel.app
```

**Authorized redirect URIs:**
```
https://YOUR-API.onrender.com/api/v1/auth/google/callback
```

Put Client ID + secret in Render env vars → **Manual Deploy** to restart backend.

---

## Step 5 — Link frontend ↔ backend

In **Render**, set:
```
CLIENT_ORIGIN=https://YOUR-APP.vercel.app
```
Redeploy backend.

---

## Step 6 — Share with testers

Send them: **`https://YOUR-APP.vercel.app`**

- They click **Sign in with Google**
- First sign-in auto-creates their account (closed beta = unlimited quota for testing)
- Each tester connects their own mailbox in the dashboard

Optional: give integrators your `REST_API_KEY` for `Authorization: Bearer ...` on `/api/v1/*`.

---

## Smoke test

```powershell
cd extractpilot-backend
$env:WEB_URL="https://YOUR-APP.vercel.app"
$env:API_URL="https://YOUR-API.onrender.com"
bun run verify:deploy
```

Manual checklist:
- [ ] Sign in with Google on Vercel URL
- [ ] Save extraction schema
- [ ] Connect mailbox
- [ ] Run extract → see results

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails / redirect error | Redirect URI must match Render URL exactly |
| API 502 / slow first load | Render waking from sleep — wait 60s, retry |
| CORS errors | Set `CLIENT_ORIGIN` to exact Vercel URL (no trailing slash) |
| OAuth not configured | Set all 3: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_ACCESS_SECRET` |
