# Client Status — Gateway Entertainment Group
## Virtual Gifting & Livestream Battle Plugin

**Updated:** 2026-08-18  
**Status:** Supabase + Stripe test keys connected — ready for developer livestream integration

---

## Delivered (what you can review)

| Area | Status |
|------|--------|
| Gift engine (catalog, send, history, animations contract) | Done |
| Wallet + atomic ledger + idempotency | Done |
| Battle / PK engine | Done |
| Leaderboards | Done |
| Admin dashboard (gifts, packages, users, battles, txns) | Done |
| Demo livestream UI (gift tray + PK) | Done |
| Client SDK for host web app | Done |
| Realtime Socket.IO events | Done |
| i18n architecture | Done |
| Full documentation pack | Done |
| **Supabase Postgres** (schema + seed) | Done |
| **Stripe test keys wired** (sk_test + pk_test) | Done |
| Agora adapter seam (ready for App ID/Certificate) | **App ID received** — certificate optional next |

---

## How to review right now

| App | URL |
|-----|-----|
| Demo livestream | http://localhost:5173 |
| Admin dashboard | http://localhost:5174 |
| API health | http://localhost:3001/health |

Admin login external ID: `admin-gateway`  
Demo viewer auto-loads with seeded coins.

---

## Supabase vs GitHub (important)

These are **not the same thing**:

| | Supabase | GitHub |
|--|----------|--------|
| What it stores | **Database** (users, gifts, wallets, battles) | **Source code** (API, SDK, admin, docs) |
| Why we use it | App data lives in the cloud | Developer clones/pulls code to integrate into your web app |
| Status | Connected | Code is local; push to GitHub when you want shared repo access |

So: Supabase = data. GitHub = code handoff for your developer.

---

## Stripe

- Test **secret** + **publishable** keys received and configured
- Coin package Checkout can be created via API
- Still needed for automatic wallet credit after payment: **Stripe Webhook Signing Secret** (`whsec_...`)
  - Stripe Dashboard → Developers → Webhooks → endpoint `https://YOUR_API/api/payments/webhook` → copy signing secret

---

## How your developer integrates into the livestream (Agora)

Yes — integrate into your existing web app livestream page:

1. Keep Agora video as-is  
2. Add Gift button + tray on that same page  
3. Call our SDK/API with your user ID + Agora channel ID  
4. Listen for `gift.sent` / battle events for overlays  

Guide: `INTEGRATION_GUIDE.md`

---

## Agora

- **App ID** configured: `de77ff1936c74c4abeb7ad5803198ad3`
- **App Certificate** still optional (needed for secure token minting in production)
- Livestream provider now uses the Agora adapter when `PROVIDERS_MODE=live`

---

## Still needed from client (optional next)

1. Stripe **webhook secret** (`whsec_...`)  
2. Agora **App Certificate** (for secure RTC/RTM tokens)  
3. GitHub repo (or invite) if you want shared source access  
4. Staging URL of livestream page for embed help  

---

## Demo accounts

| Role | External ID |
|------|-------------|
| Super Admin | `admin-gateway` |
| Creator | `creator-demo` |
| Opponent | `creator-opponent` |
| Viewer | `viewer-demo` |
