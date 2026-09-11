# Developer Handoff — Integrate Virtual Gifting into Your Web App

**For:** Gateway Entertainment Group developer  
**Email:** gatewayentertainment2026@gmail.com  
**Product:** Reusable livestream virtual gifting + PK battle plugin

---

## Important: what those IDs are for

| Credential | Used by | Not used for |
|------------|---------|--------------|
| Supabase DB URL | Our gifting API database | Not your Agora video |
| Stripe keys | Coin wallet top-ups in our API | Does not replace your existing Stripe UI unless you choose to |
| Agora App ID / Certificate | Optional token helper + livestream session mapping | **Does not replace your existing Agora RTC integration** |

If “IDs don’t work” when pasting into your current Agora livestream code: that’s expected.  
**Keep your working Agora A/V code.** You only pass the **channel ID** into our gifting API.

---

## What you receive

1. This source monorepo (API, admin, demo, SDK, docs)
2. Supabase database already schema’d + seeded
3. Stripe test keys + webhook secret configured in `.env` (local)
4. Agora App ID + Certificate configured in `.env` (local)

---

## Run the demo locally (prove it works)

```bash
pnpm install
cp .env.example apps/api/.env   # then paste real secrets from the package README/secure note
pnpm db:generate
pnpm --filter @gateway/api exec prisma db push
pnpm db:seed
pnpm dev:api      # :3001
pnpm dev:demo     # :5173
pnpm dev:admin    # :5174
```

- Demo: http://localhost:5173  
- Admin: http://localhost:5174 (external ID `admin-gateway`)  
- Health: http://localhost:3001/health  

---

## Integrate into YOUR livestream page (Agora)

### Step 1 — Install / link the SDK

From your web app (or copy `packages/sdk`):

```ts
import { createGiftingClient } from "@gateway/sdk";

const client = createGiftingClient({
  apiUrl: "https://YOUR_DEPLOYED_API_URL", // or http://localhost:3001 while testing
});
```

### Step 2 — Map your logged-in user

```ts
await client.login({
  externalUserId: String(yourUser.id),   // your existing user id
  username: yourUser.username,
  displayName: yourUser.displayName,
  avatar: yourUser.avatarUrl,
  role: yourUser.isHost ? "CREATOR" : "VIEWER",
});
```

### Step 3 — Register the Agora channel as a livestream

Use the **same channel name/ID you already use for Agora RTC**:

```ts
const { livestream } = await client.ensureLivestream({
  externalLivestreamId: agoraChannelId, // your existing channel
  provider: "agora",
  hostUserId: creatorPluginUserId,      // plugin user id of host
  title: roomTitle,
});
```

### Step 4 — Add Gift UI on the live screen

- Button: opens gift tray  
- Load gifts: `await client.getGifts()`  
- Send:

```ts
await client.sendGift({
  giftId,
  receiverId: hostPluginUserId,
  livestreamId: livestream.id,
  quantity: 1,
  battleId: activeBattleId, // optional
  idempotencyKey: crypto.randomUUID(),
});
```

### Step 5 — Listen for realtime events (animations)

```ts
client.connectRealtime(
  [`livestream:${livestream.id}`, `user:${pluginUserId}`],
  (event) => {
    if (event.type === "gift.sent") {
      // play animation using event.animationUrl / giftIconUrl
    }
    if (event.type === "battle.score_updated") {
      // update PK bar
    }
  },
);
```

### Step 6 — Stripe (coins)

Option A (recommended with our API): call `client.checkout({ coinPackageId, successUrl, cancelUrl })`  
Webhook endpoint on our API: `POST /api/payments/webhook` (already verifies `whsec_…`)

Option B: keep your Stripe UI; after successful payment, call our admin/wallet adjust API or a secured credit endpoint you add with your backend auth.

---

## Admin panel

Deploy `apps/admin` against the same API. Manage gifts, prices, categories, coin packages, battles, users.

---

## Docs to read (in order)

1. `INTEGRATION_GUIDE.md`  
2. `API_DOCUMENTATION.md`  
3. `REALTIME_EVENTS.md`  
4. `AGORA_INTEGRATION.md`  
5. `STRIPE_INTEGRATION.md`  
6. `CLIENT_STATUS.md`  

---

## Common “IDs don’t work” fixes

1. **Agora video still works?** → Don’t replace RTC; only pass `agoraChannelId` to `ensureLivestream`.  
2. **Stripe test keys** → use Checkout in test mode; cards like `4242…`.  
3. **Webhook** → Stripe Dashboard webhook URL must point to your **deployed** API `/api/payments/webhook`, not localhost (unless using Stripe CLI).  
4. **Database** → API must use the Supabase pooler URI (IPv4), not direct `db.*:5432` if IPv6 fails.  
5. **CORS** → add your web app origin to `CORS_ORIGINS`.

---

## Support checklist for first embed

- [ ] API running / deployed  
- [ ] `login` succeeds with your user ids  
- [ ] `ensureLivestream` with real Agora channel  
- [ ] Gift tray renders from `getGifts`  
- [ ] `sendGift` deducts coins  
- [ ] `gift.sent` event received in UI  
- [ ] (Optional) Stripe Checkout recharge  
- [ ] (Optional) PK battle start/score/end  

That’s the full path to put virtual gifting on your existing Agora livestream.
