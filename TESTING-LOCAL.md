# Local testing guide

## 1. Start infrastructure

```bash
cd /home/ubuntu/projects/EMB
docker compose up -d   # or your existing extractpilot-postgres/redis containers
```

Postgres: `localhost:5433` · Redis: `6379`

## 2. Backend

```bash
cd extractpilot-backend
bun install
bun run db:push
bun run dev    # API :3002 + worker
```

### Required `.env` values

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/email_parser` | Schema |
| `REDIS_URL=redis://localhost:6379` | Queue |
| `REST_API_KEY=<long secret>` | API auth when Google OAuth is off |
| `OPENROUTER_API_KEY=<key>` | **Required for real extraction** |
| `SECRETS_ENCRYPTION_KEY=<32+ chars>` | Mailbox password storage |

Optional for dashboard login: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.

## 3. Frontend

```bash
cd extractpilot-frontend
bun install
bun run dev    # :3000, proxies /api/v1 → API
```

Set `API_URL=http://localhost:3002` in `extractpilot-frontend/.env`.

## 4. Auth modes

### A) API key only (fastest, no Google)

1. Open **http://localhost:3000/dashboard/settings**
2. Paste the same value as backend `REST_API_KEY` → **Save key**
3. Browse the dashboard (tenant scoping is relaxed when OAuth is off)

### B) Google OAuth

Fill Google OAuth env vars on the backend, restart, then **http://localhost:3000/login**.

## 5. Smoke checks

```bash
curl -s http://localhost:3002/health
export API_URL=http://localhost:3002 WEB_URL=http://localhost:3000
cd extractpilot-backend && bun run verify:deploy
```

With API key:

```bash
export KEY="$(grep '^REST_API_KEY=' extractpilot-backend/.env | cut -d= -f2)"
curl -s -H "Authorization: Bearer $KEY" http://localhost:3002/api/v1/usage
```

## 6. Manual UI test path (~15 min)

1. **Prompt studio** — save a query + schema  
2. **Mailboxes** — connect IMAP (Gmail app password)  
3. **Pipeline** — run extract (lookback 1 day)  
4. **Results** — view / export CSV  
5. **Health** — retry / DLQ replay  
6. **Settings** — webhook URL (use [webhook.site](https://webhook.site) for a test receiver)

## 7. Without OpenRouter

You can still test: login/API, mailboxes, queue enqueue, ops UI, integrations.  
Worker jobs will **fail** until `OPENROUTER_API_KEY` is set.

## 8. Attachment OCR

Default `ATTACHMENT_MODE=stub` (no OCR cost). For PDF parsing set `ATTACHMENT_MODE=full` + `PADDLEOCR_API_URL` / token in backend `.env`.
