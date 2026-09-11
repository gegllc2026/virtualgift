# Integration Guide (Client Developer)

This guide is for the developer integrating the Gateway gifting plugin into the host livestream application (GoDaddy Airo / custom + Agora + Stripe).

## What you receive

1. This monorepo (API, admin, SDK, adapters)
2. PostgreSQL migrations / Prisma schema
3. `.env.example`
4. Demo app showing gift tray + PK battle
5. Admin dashboard for catalog & settings

You keep ownership of:

- Agora **audio/video**
- Host user authentication UX
- Final production deployment of the host app

## Recommended integration shape

```
Host App (Airo / React / etc.)
  └─ @gateway/sdk
       ├─ REST → Gateway API
       └─ Socket.IO ← gift / battle / wallet events
```

Do **not** put Stripe secret keys or Agora certificates in the frontend.

## Installation (SDK)

From your host app (after publishing or path-linking the package):

```bash
pnpm add @gateway/gifting-sdk
# or workspace path during development:
pnpm add @gateway/sdk
```

```ts
import { createGiftingClient } from "@gateway/sdk";

const client = createGiftingClient({
  apiUrl: import.meta.env.VITE_GIFTING_API_URL,
});

await client.login({
  externalUserId: hostUser.id, // your user id
  username: hostUser.username,
  displayName: hostUser.displayName,
  avatar: hostUser.avatar,
  role: hostUser.isCreator ? "CREATOR" : "VIEWER",
});

const { livestream } = await client.ensureLivestream({
  externalLivestreamId: agoraChannelId,
  provider: "agora",
  hostUserId: creatorPluginUserId,
  title: roomTitle,
});

const { gifts, categories } = await client.getGifts();

client.connectRealtime(
  [`livestream:${livestream.id}`, `user:${pluginUserId}`],
  (event) => {
    if (event.type === "gift.sent") playGiftAnimation(event);
    if (event.type === "battle.score_updated") updatePkBar(event);
  },
);

await client.sendGift({
  giftId,
  receiverId: creatorPluginUserId,
  livestreamId: livestream.id,
  quantity: 1,
  battleId: activeBattleId, // optional
  idempotencyKey: crypto.randomUUID(),
});
```

## Environment variables

See root `.env.example`. Minimum for mock local:

```
DATABASE_URL=...
JWT_SECRET=...
PROVIDERS_MODE=mock
REALTIME_PROVIDER=socket
```

Live:

```
PROVIDERS_MODE=live
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...
```

## Database

```bash
docker compose up -d
pnpm db:generate
pnpm --filter @gateway/api exec prisma db push
pnpm db:seed
```

## Identity bridge

Map host users via `externalUserId`. The plugin stores its own `User.id` (cuid). Persist the mapping if you need to correlate earnings reports.

For production, prefer replacing `/api/auth/login` with a **host-signed JWT exchange** (shared `HOST_JWT_SECRET`) — the login route is a convenient bridge for demo and early integration.

## Agora

See [AGORA_INTEGRATION.md](./AGORA_INTEGRATION.md). The plugin does not replace RTC. It only stores an external livestream reference and can bridge events via Socket.IO or Agora RTM adapter.

## Stripe

See [STRIPE_INTEGRATION.md](./STRIPE_INTEGRATION.md). Coins are credited **only** after verified webhook (or explicit mock complete in `PROVIDERS_MODE=mock`).

## Battles

1. `createBattle` with participant plugin user IDs (MVP: 2)
2. `startBattle`
3. Viewers send gifts with `battleId` + `receiverId` = participant
4. Scores update via `battle.score_updated`
5. `endBattle` determines winner (or draw)

Duration and score multiplier are configurable per battle / admin settings.

## Admin

Deploy `apps/admin` against the same API. Seeded super admin external id: `admin-gateway`.

## Checklist before production

- [ ] `PROVIDERS_MODE=live`
- [ ] Strong `JWT_SECRET`
- [ ] Stripe webhook endpoint with signature verification
- [ ] Postgres backups
- [ ] CORS locked to host origins
- [ ] Rate limits tuned
- [ ] Mock routes unreachable (`/api/payments/mock/complete` blocked when not mock)
- [ ] Gift assets hosted on your CDN / storage adapter
