# ExtractPilot

This project is split into **two independent apps** (no turborepo):

| Folder | Stack | Run |
|--------|-------|-----|
| [extractpilot-backend](./extractpilot-backend) | Bun API + worker | `cd extractpilot-backend && bun install && bun run dev` |
| [extractpilot-frontend](./extractpilot-frontend) | Next.js | `cd extractpilot-frontend && bun install && bun run dev` |

Deploy: see `docs/DEPLOY-SPLIT.md` inside each folder.
