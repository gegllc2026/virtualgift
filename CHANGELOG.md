# Changelog

## 0.1.0 — 2026-08-14

### Added

- Greenfield monorepo for Gateway virtual gifting + PK battles
- Core engines: wallet (atomic), gifting (idempotent), battle lifecycle, leaderboards
- Adapters: Stripe + mock, Socket.IO realtime + mock, Agora livestream/RTM seams, local/S3 storage
- Fastify API with auth, gifts, wallet, payments, battles, leaderboards, locales, admin
- Admin dashboard (React)
- Demo livestream UI (gift tray + battle bar)
- Client SDK (`@gateway/sdk`)
- i18n catalogs: en, es, fr, de, pt, ar (starter quality)
- Documentation pack + `.env.example` + Docker Compose Postgres (optional)
- Local SQLite demo mode + `start-demo.bat` one-click launcher
- `CLIENT_STATUS.md` handoff for client review
- Unit tests for scoring strategy and i18n helpers

### Pending client action

- Provide real Supabase database password to migrate off local SQLite
