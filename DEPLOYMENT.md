# Deployment

## Suggested topology

1. **API** — Node 20+ service (`apps/api`) behind HTTPS
2. **PostgreSQL** — managed Postgres
3. **Admin** — static build of `apps/admin` (CDN / object storage)
4. **Demo** — optional; not required in production
5. **Uploads** — local disk only for demos; use S3-compatible storage in prod

## Build

```bash
pnpm install
pnpm db:generate
pnpm -r --filter=./packages/* build
pnpm --filter @gateway/api build
pnpm --filter @gateway/admin build
```

## Runtime env

Set production secrets via your host (never commit `.env`):

- `NODE_ENV=production`
- `PROVIDERS_MODE=live`
- `DATABASE_URL`
- `JWT_SECRET`
- `STRIPE_*`
- `AGORA_*`
- `CORS_ORIGINS`

Mock providers **throw on boot** when `NODE_ENV=production` and `PROVIDERS_MODE=mock`.

## Stripe webhook

Point Stripe to `https://<api-host>/api/payments/webhook` and set `STRIPE_WEBHOOK_SECRET`.

## Health

`GET /health` for load balancer checks.
