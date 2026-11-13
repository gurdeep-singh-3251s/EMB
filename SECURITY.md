# ExtractPilot — security notes

## Secrets

- **JWT_ACCESS_SECRET** — session signing; rotate if leaked.
- **SECRETS_ENCRYPTION_KEY** — encrypts IMAP passwords at rest (32+ bytes).
- **OPENROUTER_API_KEY** — LLM provider; never log prompts in prod (`OPENROUTER_DEBUG=false`).
- **REST_API_KEY** — integrators only; use `X-API-Key`, not Bearer, when OAuth is on.

## Tenant isolation

- Emails, prompts, mailboxes, and usage are scoped by `owner_user_id`.
- Every sensitive `/api/v1/*` route requires Google JWT when OAuth is configured.

## Reporting issues

Email your security contact with steps to reproduce. Do not open public issues for active vulnerabilities.

## Production checklist

- [ ] HTTPS on API and web
- [ ] `CLIENT_ORIGIN` matches real web URL
- [ ] Stripe webhook secret configured
- [ ] Redis + Postgres not exposed publicly
- [ ] `BETA_UNLIMITED_QUOTA=false` when enforcing plans
- [ ] Attachment retention and privacy policy published
