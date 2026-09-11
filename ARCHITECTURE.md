# ARCHITECTURE — Gateway Entertainment Group
## Virtual Gifting & Livestream Battle Plugin

---

## 1. Design Goals

1. **Reusable plugin** — integrate into multiple livestream hosts without rewriting core logic.
2. **Separation of core from platform** — Agora, Stripe, and realtime are adapters only.
3. **Financial safety** — atomic wallet updates, idempotency, server authority.
4. **Realtime-first UX** — typed, versioned events for gifts, battles, wallets, leaderboards.
5. **Admin-configurable** — gifts, coins, battles, locales, branding settings.
6. **i18n from day one** — no hardcoded user-facing strings in product UI.
7. **Modular monolith** — one deployable API; clear packages; no premature microservices.

---

## 2. System Context

```
┌─────────────────────────────────────────────────────────────┐
│  Client Host App (GoDaddy Airo / custom)                     │
│  - Agora A/V                                                  │
│  - User auth                                                  │
│  - Embeds Gift Tray / Battle UI via SDK                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST + WebSocket / RTM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Virtual Gifting Plugin                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Gift Engine  │  │ Battle Engine│  │ Wallet / Tx Engine │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘ │
│         └─────────────────┼────────────────────┘            │
│                           ▼                                   │
│              Provider Interfaces (ports)                      │
│         ┌─────────┬──────────┬──────────┬─────────┐         │
│         ▼         ▼          ▼          ▼         ▼         │
│      Stripe    Realtime   Agora      Storage   User Bridge  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ Admin REST
┌───────────────────────────┴─────────────────────────────────┐
│  Admin Dashboard (React)                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Layout

```
gateway-gifting/
├── apps/
│   ├── api/                 # Fastify HTTP + WS API
│   ├── admin/               # Admin SPA (Vite + React)
│   └── demo/                # Example host integration
├── packages/
│   ├── core/                # Domain engines (no HTTP, no Stripe SDK)
│   ├── adapters/            # Agora, Stripe, Realtime, Storage, Mocks
│   ├── sdk/                 # @gateway/gifting-sdk
│   ├── shared/              # Types, Zod schemas, event defs, i18n catalogs
│   └── config/              # Shared tsconfig / eslint
├── docs/                    # Extra guides (linked from root docs)
├── .env.example
├── package.json             # pnpm workspace root
├── pnpm-workspace.yaml
├── PROJECT_AUDIT.md
├── ARCHITECTURE.md
└── README.md
```

---

## 4. Package Boundaries

### `packages/shared`
- Zod schemas for API payloads
- `RealtimeEvent` discriminated union (versioned)
- Error codes
- i18n message catalogs (`en`, stubs for `es`, `fr`, `de`, `pt`, `ar`)
- Shared constants (roles, battle statuses, tx types)

### `packages/core`
Pure domain logic. **May not import** Stripe, Agora, Socket.IO, or Fastify.

| Module | Responsibility |
|--------|----------------|
| `gifting/` | Catalog, send gift, validate qty/active |
| `wallet/` | Balance ops under DB transaction |
| `transactions/` | Immutable ledger records |
| `battle/` | Lifecycle, scoring strategy, winner |
| `leaderboard/` | Aggregations / queries |
| `notifications/` | In-app notification records |
| `localization/` | Resolve locale strings / settings |
| `users/` | External user mapping |
| `livestream/` | External stream session refs |
| `analytics/` | Counters / report queries |
| `settings/` | System config key-values |

### `packages/adapters`
Implements ports defined in `core` or `shared`:

| Adapter | Interface |
|---------|-----------|
| `StripePaymentProvider` | `PaymentProvider` |
| `MockPaymentProvider` | `PaymentProvider` |
| `SocketRealtimeProvider` | `RealtimeProvider` |
| `AgoraRtmRealtimeProvider` | `RealtimeProvider` |
| `MockRealtimeProvider` | `RealtimeProvider` |
| `AgoraLivestreamAdapter` | `LivestreamProvider` |
| `MockLivestreamProvider` | `LivestreamProvider` |
| `LocalStorageProvider` / `S3StorageProvider` | `StorageProvider` |

### `packages/sdk`
Browser-oriented client:
- `createGiftingClient({ apiUrl, token, realtime })`
- Load gifts, send gift (idempotency key), subscribe to events
- Battle join/start helpers
- Optional React hooks package surface (same package initially)

### `apps/api`
- Auth middleware (JWT)
- Admin RBAC
- Route mounting
- Wires Prisma + adapters based on env
- Stripe webhook (raw body + signature)
- Rate limiting, secure headers, structured logging

### `apps/admin`
- Gift CRUD, categories, animations
- Coin packages, wallet adjustments
- Battles, users, transactions, analytics
- Localization + system settings
- Role-gated routes

### `apps/demo`
- Minimal “host” showing gift tray + PK UI against API
- Uses mock or real adapters via env

---

## 5. Provider Interfaces (Ports)

```ts
interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(payload: Buffer, signature: string): Promise<WebhookEvent>;
  refundPayment(providerPaymentId: string, amount?: number): Promise<boolean>;
}

interface RealtimeProvider {
  publish(channel: string, event: RealtimeEvent): Promise<void>;
  subscribe(channel: string, handler: (e: RealtimeEvent) => void): Promise<() => void>;
}

interface LivestreamProvider {
  resolveSession(externalId: string): Promise<LivestreamSession>;
  broadcastEvent(externalId: string, event: RealtimeEvent): Promise<void>;
}

interface UserProvider {
  getUser(externalUserId: string): Promise<User>;
  ensureUser(input: EnsureUserInput): Promise<User>;
}

interface StorageProvider {
  upload(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}

interface BattleScoringStrategy {
  calculatePoints(giftCoinCost: number, quantity: number): number;
}
```

Default scoring: `points = giftCoinCost * quantity * multiplier` (multiplier from battle settings).

---

## 6. Data Flow — Send Gift

```
Client SDK
  POST /api/gifts/send { giftId, livestreamId, quantity, idempotencyKey }
        │
        ▼
API validates auth + payload
        │
        ▼
GiftEngine.sendGift()  [DB transaction]
  - load gift (active)
  - lock wallet (SELECT FOR UPDATE)
  - ensure balance >= total
  - deduct coins
  - write WalletTransaction (GIFT_SENT)
  - write GiftSend
  - credit creator earnings ledger (GIFT_RECEIVED / pending settle)
  - if active battle → BattleEngine.applyGiftScore()
        │
        ▼
Commit
        │
        ▼
RealtimeProvider.publish(livestream channel, gift.sent + wallet.updated [+ battle.score])
```

---

## 7. Data Flow — Coin Purchase

```
Client → POST /api/payments/checkout { coinPackageId, idempotencyKey }
API → StripePaymentProvider.createCheckout()
Stripe Checkout / PaymentIntent
Stripe → POST /api/payments/webhook (signature verified)
API → credit wallet atomically (PURCHASE), mark Payment succeeded
Realtime → wallet.updated
```

Frontend never credits coins.

---

## 8. Battle Lifecycle

```
CREATED → WAITING → STARTING → ACTIVE → FINISHED
                              ↘ CANCELLED
```

- Configurable duration, min/max participants, scoring multiplier, allowed gifts
- MVP: exactly 2 participants to start
- Schema: N participants via `BattleParticipant`
- End: highest score wins; ties → configurable `DRAW` or host rule

---

## 9. Database

- **PostgreSQL** via **Prisma**
- Integer coins and fiat minor units only (no floats for money)
- Indexes on: `externalUserId`, `GiftSend(livestreamId, createdAt)`, `Battle(status)`, wallet `userId`, payments `providerPaymentId`, idempotency keys (unique)
- Soft-deactivate gifts (`isActive`) rather than hard-delete when history exists

---

## 10. Auth & Admin Security

| Actor | Mechanism |
|-------|-----------|
| Viewer / creator | JWT issued by API (or trusted host-signed JWT bridge) |
| Admin | JWT + role (`SUPER_ADMIN`, `ADMIN`, `MODERATOR`, `ANALYST`) |
| Stripe webhook | Signature verification only |
| Service | Optional API keys for server-to-server |

Audit log for admin mutations.

---

## 11. Realtime Events

Version field on every event: `v: 1`.

Discriminated union examples:
- `gift.sent`
- `battle.started` / `battle.score_updated` / `battle.ended`
- `wallet.updated`
- `leaderboard.updated`

Channels: `livestream:{id}`, `user:{id}`, `battle:{id}`, `admin:ops` (optional).

---

## 12. i18n

- Message catalogs in `packages/shared/src/i18n`
- Keys: `gift.send`, `gift.insufficientBalance`, `battle.start`, …
- Admin configures default locale + enabled locales
- RTL: `dir` attribute driven by locale (`ar`)

---

## 13. Mock / Demo Mode

`PROVIDERS_MODE=mock|live`

- Production boot **fails** if mock providers selected when `NODE_ENV=production`
- Demo app defaults to mock for zero-credential local runs

---

## 14. Observability

Structured JSON logs + in-process counters (exportable later):
- `gift_sent_total`, `gift_failed_total`
- `payment_success_total`, `payment_failed_total`
- `battle_started_total`, `battle_completed_total`
- `realtime_event_failures`

---

## 15. Non-Goals (MVP)

- Cloning TikTok assets/animations/trademarks
- Owning Agora A/V pipeline
- Microservices / Kubernetes operators
- PayPal (interface only)
- Multi-currency coin wallets (single coin unit; fiat currency configurable per package)

---

## 16. Implementation Notes

- Prefer Fastify for schema validation speed + raw body for Stripe
- Prefer Prisma for migrations clarity for client handoff
- Prefer Socket.IO as default realtime (simplest for host web apps); Agora RTM as alternate adapter
- Admin UI: original dark professional dashboard (not a TikTok clone)
- Gift tray / battle UI in demo: original premium livestream patterns inspired by familiar UX, not pixel copies
