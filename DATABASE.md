# Database

## Engine

- **Local demo (default):** SQLite via Prisma (`file:./prisma/dev.db`) — no Docker required
- **Production / Supabase:** PostgreSQL — switch `provider` to `postgresql` in `schema.prisma` and set `DATABASE_URL`

## Supabase (configured)

Project: `qqzlzblnbssikredpqya` (`https://qqzlzblnbssikredpqya.supabase.co`)

Use the **Session pooler** URI (IPv4). Direct `db.*.supabase.co:5432` is IPv6-only and often unreachable.

```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

URL-encode special characters in the password (e.g. `*` → `%2A`).

```bash
pnpm db:generate
pnpm --filter @gateway/api exec prisma db push
pnpm db:seed
```

Schema is on PostgreSQL (Supabase). Optional local SQLite demo: set `provider = "sqlite"` temporarily.

## Core tables

| Model | Purpose |
|-------|---------|
| User | Plugin user + `externalUserId` bridge |
| Wallet | Integer coin balance |
| WalletTransaction | Immutable ledger (`reference` unique) |
| Gift / GiftCategory | Configurable catalog |
| GiftSend | Gift history / creator earnings source |
| Livestream | External stream reference (Agora channel, etc.) |
| Battle / BattleParticipant / BattleEvent | PK lifecycle + scoring |
| CoinPackage / Payment | Top-up catalog + provider payments |
| IdempotencyRecord | Gift/payment idempotency |
| AuditLog | Admin mutations |
| SystemSetting | Runtime config JSON |
| LeaderboardSnapshot | Period aggregates |
| Notification | Optional in-app notices |

## Money rules

- Coins: integer
- Fiat: integer minor units
- No floating point for balances

## Commands

```bash
pnpm db:generate
pnpm --filter @gateway/api exec prisma db push
pnpm db:seed
# or migrations:
pnpm --filter @gateway/api exec prisma migrate dev --name init
```
