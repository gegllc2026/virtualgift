# API Documentation

Base URL: `http://localhost:3001` (configurable via `API_URL`)

All JSON responses:

```json
{ "success": true, "data": { } }
```

or

```json
{ "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "..." } }
```

Auth: `Authorization: Bearer <jwt>` from `POST /api/auth/login`.

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Ensure user + issue JWT |
| GET | `/api/auth/me` | Yes | Current user + wallet |
| POST | `/api/auth/ensure-user` | Yes | Upsert external user |

## Gifts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/gifts` | No | Active gifts + categories |
| GET | `/api/gifts/:id` | No | Gift detail |
| POST | `/api/gifts/send` | Yes | Send gift (`idempotencyKey` required) |
| GET | `/api/gifts/history/me` | Yes | Sender history |

### Send gift body

```json
{
  "giftId": "...",
  "receiverId": "...",
  "livestreamId": "...",
  "quantity": 1,
  "battleId": "...",
  "idempotencyKey": "unique-key-per-attempt"
}
```

## Wallet

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/wallet` | Yes | Balance |
| GET | `/api/wallet/transactions` | Yes | Ledger |

## Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/payments/coin-packages` | No | Active packages |
| POST | `/api/payments/checkout` | Yes | Create checkout session |
| POST | `/api/payments/webhook` | Stripe sig | Provider webhook |
| POST | `/api/payments/mock/complete` | Yes | Mock credit (dev only) |

## Livestreams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/livestreams/ensure` | Yes | Upsert external stream ref |
| GET | `/api/livestreams/:id` | Yes | Get by internal id |

## Battles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/battles` | Yes | Create (2–8 participants) |
| GET | `/api/battles/:id` | Yes | Detail |
| POST | `/api/battles/:id/start` | Yes | Start |
| POST | `/api/battles/:id/end` | Yes | End + winner |
| POST | `/api/battles/:id/cancel` | Creator/Admin | Cancel |

## Leaderboards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboards/battle/:battleId` | Battle scores |
| GET | `/api/leaderboards/livestream/:livestreamId` | Stream gifters |
| GET | `/api/leaderboards/period/:scope` | `daily` \| `weekly` \| `monthly` |

## Locales

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/locales` | Supported locales |
| GET | `/api/locales/:code` | Message catalog |

## Admin (`/api/admin/*`)

Requires admin role (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `ANALYST`). Mutations require `ADMIN` / `SUPER_ADMIN`.

- `GET /dashboard`
- `GET|POST /gifts`, `PATCH|DELETE /gifts/:id`
- `GET|POST /categories`
- `GET|POST|PATCH /coin-packages`
- `POST /wallet/adjust`
- `GET /users`
- `GET /payments`
- `GET /gift-transactions`
- `GET /battles`
- `GET|PUT /settings/:key`
- `GET /analytics`

## Health

`GET /health` — liveness + in-process metrics snapshot.
