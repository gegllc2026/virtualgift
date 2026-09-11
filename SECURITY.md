# Security

## Controls implemented

- JWT authentication on protected routes
- Admin RBAC (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `ANALYST`)
- Zod validation on external inputs
- Rate limiting (`@fastify/rate-limit`)
- Helmet secure headers
- CORS allowlist
- Stripe webhook signature verification
- Wallet updates via transactional ledger + unique `reference`
- Idempotency keys for gifts/checkouts
- Admin audit log
- Structured logging with redaction hooks
- Secrets via environment variables only
- Mock providers blocked in production

## Rules

- Never expose Stripe secret keys, DB URLs, Agora certificates, or JWT secrets to the frontend
- Never trust client-reported balances, gift prices, or payment success
- Do not log tokens, passwords, or card data
- Prefer soft-deactivate for gifts with history

## Recommended hardening (ops)

- Rotate JWT/Stripe secrets
- WAF / IP allowlist for admin if applicable
- Postgres least-privilege DB user
- HTTPS everywhere
- Regular dependency audits (`pnpm audit`)
