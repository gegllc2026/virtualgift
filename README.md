# Gateway Entertainment Group — Virtual Gifting & Battle Plugin

Reusable livestream **virtual gifting**, **wallet/coins**, **Stripe top-ups**, and **PK battle** system for Gateway Entertainment Group.

This is an **original** plugin/SDK — not a clone of TikTok (or any platform) proprietary code, assets, or trademarks. Gift names, prices, icons, animations, battle rules, branding, and languages are fully configurable.

## What's in this repo

| Path | Purpose |
|------|---------|
| `apps/api` | Fastify REST + Socket.IO realtime API |
| `apps/admin` | Admin dashboard (gifts, packages, battles, users, settings) |
| `apps/demo` | Example host app: gift tray + PK battle UI |
| `packages/core` | Domain engines (gift, wallet, battle, leaderboard) |
| `packages/adapters` | Stripe, Agora, Socket realtime, storage (+ mocks) |
| `packages/sdk` | `@gateway/sdk` client for host app developers |
| `packages/shared` | Types, Zod schemas, realtime events, i18n |

## Quick start

### One-click local demo (Windows)

Double-click `start-demo.bat` — it seeds the DB and opens API + Demo + Admin.

### Manual

#### Prerequisites

- Node.js 20+
- pnpm 10+
- No Docker required for local demo (SQLite). Supabase/Postgres for production.

#### 1. Install

```bash
pnpm install
```

#### 2. Environment

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Default `DATABASE_URL` uses local SQLite. Default mode is `PROVIDERS_MODE=mock`.

#### 3. Database

```bash
pnpm db:generate
pnpm --filter @gateway/api exec prisma db push
pnpm db:seed
```

See [CLIENT_STATUS.md](./CLIENT_STATUS.md) for demo accounts and review checklist.  
When the real Supabase password arrives, follow [DATABASE.md](./DATABASE.md) to switch to Postgres.

### 4. Run

```bash
# API (port 3001)
pnpm dev:api

# Demo livestream UI (port 5173)
pnpm dev:demo

# Admin (port 5174)
pnpm dev:admin
```

Demo viewer starts with **50,000** coins (seeded). Admin login uses external id `admin-gateway`.

## Documentation

- [PROJECT_AUDIT.md](./PROJECT_AUDIT.md) — repository inspection findings
- [ARCHITECTURE.md](./ARCHITECTURE.md) — module boundaries & flows
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) — for the client's developer
- [AGORA_INTEGRATION.md](./AGORA_INTEGRATION.md)
- [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md)
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)
- [REALTIME_EVENTS.md](./REALTIME_EVENTS.md)
- [DATABASE.md](./DATABASE.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [SECURITY.md](./SECURITY.md)
- [CHANGELOG.md](./CHANGELOG.md)

## Design principles

1. **Core never imports Stripe/Agora/Socket SDKs** — adapters only.
2. **Server is authoritative** for balances, gift costs, battle winners, payments.
3. **Idempotency** on gift send and checkout.
4. **i18n keys** from day one (`en` + starter catalogs for `es/fr/de/pt/ar`, RTL-aware).
5. **Mock providers blocked in production** when `NODE_ENV=production`.

## License

Proprietary — Gateway Entertainment Group.
