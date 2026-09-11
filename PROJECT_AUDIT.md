# PROJECT AUDIT — Gateway Entertainment Group
## Virtual Gifting & Livestream Battle Plugin

**Audit date:** 2026-08-12  
**Auditor role:** Senior Software Architect / Lead Full-Stack Engineer  
**Repository path:** `c:\Users\Pelumi\Desktop\Tiktok project`

---

## 1. Current Architecture

| Finding | Detail |
|--------|--------|
| Repository state | **Empty greenfield** — 0 source files, no `.git`, no `package.json`, no app code |
| Host application | Not present in this workspace. Client app was built with **GoDaddy Airo AI Builder** (external) |
| Livestream | Client uses **Agora** (external; no code here) |
| Payments | Client uses **Stripe** (external; no code here) |
| Delivery model | Build a **reusable plugin/SDK + API + admin** for the client's developer to integrate |

**Conclusion:** There is nothing to extend in-place. We introduce a modular monorepo designed for clean integration into an external livestream host app.

---

## 2. Existing Technologies

| Area | Status |
|------|--------|
| Frontend framework | None |
| Backend framework | None |
| Package manager | None |
| Database | None |
| Authentication | None |
| API structure | None |
| Environment config | None |
| Agora integration | None (client-side only, external) |
| Stripe integration | None (client-side only, external) |
| Realtime | None |
| User / livestream / wallet models | None |
| Deployment config | None |
| TypeScript / JS config | None |
| Testing / lint / build | None |

---

## 3. Existing Relevant Modules

**None.** No modules, packages, or shared libraries exist in this repository.

Reference imagery provided by the client (gift tray, PK battle, admin “Manage Gift”) informs UX and admin scope only — not proprietary assets to copy.

---

## 4. Integration Points (Target)

These are the contracts the plugin must expose for the client's developer:

| Integration | Direction | Notes |
|-------------|-----------|--------|
| External user identity | Host → Plugin | Map host `userId` → plugin `User.externalUserId` |
| Livestream session | Host → Plugin | Map Agora channel / stream ID → `Livestream.externalLivestreamId` |
| Agora A/V | Host owns | Plugin must **not** own video; only RTM/events or parallel realtime |
| Stripe checkout / webhooks | Plugin owns via adapter | Host may deep-link into coin purchase UI |
| Auth tokens | Host → Plugin | JWT or API key + user claims; admin uses separate RBAC |
| Realtime events | Plugin → Host UI | Typed events for gifts, battles, wallet, leaderboards |
| Admin panel | Standalone | Deployed separately or embedded; talks to Admin API |

---

## 5. Missing Components (All Must Be Built)

- Core: gifting, wallet, transactions, battle, leaderboard, notifications, localization, analytics
- Adapters: Agora, Stripe, Realtime, Storage
- Admin dashboard + Admin API
- Client SDK + event/type packages
- REST API (routes, validation, auth, rate limits)
- PostgreSQL schema, migrations, seeds
- Demo/example integration app
- Tests, docs, `.env.example`, observability hooks
- Mock providers for local/dev mode

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Empty repo / no host code | Build as standalone modular monolith + SDK; document integration clearly |
| GoDaddy Airo host may be hard to modify | Prefer embeddable UI widgets + thin SDK; REST + WebSocket contracts |
| Dual Agora usage (A/V vs messaging) | Adapter boundary; support Agora RTM **or** Socket.IO without coupling core |
| Financial correctness | Atomic wallet txs, idempotency keys, webhook signature verification |
| Concurrent gift spam | Row locks / serializable txs, rate limiting, indexed queries |
| Scope creep (multi-party battles, PayPal, etc.) | MVP: 2-participant battles; interfaces ready for N participants / other providers |
| Accidental mock providers in prod | Env guard: `NODE_ENV=production` rejects mock adapters |
| i18n late-binding | Translation keys from day one; English seed + RTL-ready layout |

---

## 7. Assumptions

1. Client's developer integrates this package into the GoDaddy/Airo (or successor) app.
2. PostgreSQL is acceptable as the system of record.
3. Node.js + TypeScript is acceptable for the plugin API and SDK.
4. Admin is a separate React SPA, not inside Airo.
5. Agora App ID / Certificate and Stripe keys will be provided via env (never committed).
6. Host app authenticates users; plugin trusts signed tokens or a documented identity bridge.
7. Coin “currency” is virtual (integer coins); fiat uses Stripe minor units.
8. MVP battles are **2 participants**; schema supports more via `BattleParticipant`.
9. File storage for gift icons/animations can start as local/S3-compatible via Storage adapter.
10. Redis is **optional** initially; add if cache/leaderboard load requires it.

---

## 8. Recommended Architecture

**Modular monolith (pnpm workspaces)** — not microservices.

```
gateway-gifting/
  apps/
    api/          # Fastify REST + WebSocket gateway
    admin/        # React admin dashboard
    demo/         # Example host app (integration reference)
  packages/
    core/         # Gifting, wallet, battle, transactions, leaderboard
    adapters/     # Agora, Stripe, Realtime, Storage (+ mocks)
    sdk/          # Browser/Node client SDK
    shared/       # Types, events, i18n keys, Zod schemas
    config/       # Shared ESLint/TS configs
```

**Provider separation (non-negotiable):**

- `LivestreamProvider` → `AgoraLivestreamAdapter` | `MockLivestreamProvider`
- `PaymentProvider` → `StripePaymentProvider` | `MockPaymentProvider`
- `RealtimeProvider` → `SocketRealtimeProvider` | `AgoraRtmAdapter` | `MockRealtimeProvider`
- `UserProvider` → `InternalUserProvider` | host bridge
- `StorageProvider` → local / S3-compatible

See `ARCHITECTURE.md` for full boundaries, data flow, and module ownership.

---

## 9. Recommended Implementation Sequence

Aligned with the master prompt:

1. **Audit** ← this document  
2. **Architecture** → `ARCHITECTURE.md` + workspace scaffold  
3. **Database** → Prisma schema, migrations, seeds  
4. **Core engines** → gift, wallet, transactions  
5. **Payment** → Stripe adapter + webhooks  
6. **Realtime** → typed events + Socket adapter  
7. **Agora** → livestream/RTM adapter (non-interfering with A/V)  
8. **Battle** → lifecycle + scoring strategy  
9. **Leaderboards** → battle / stream / period aggregates  
10. **Admin** → dashboard + protected Admin API  
11. **SDK / API polish** → client integration surface  
12. **Testing** → unit / integration / security  
13. **Documentation** → handoff pack for client developer  
14. **Final QA** → lint, typecheck, tests, build  

---

## 10. Audit Verdict

| Question | Answer |
|----------|--------|
| Extend existing code? | **No — repository is empty** |
| Duplicate existing wallet/livestream? | **N/A — create plugin-owned models + external ID refs** |
| Rewrite host app? | **No — deliver reusable plugin for host integration** |
| Ready to implement? | **Yes — proceed to architecture + scaffold** |

**Next step:** Establish module boundaries in `ARCHITECTURE.md`, then scaffold the monorepo and database schema.
