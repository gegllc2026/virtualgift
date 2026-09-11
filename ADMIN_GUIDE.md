# Admin Guide

## Access

1. Run API + admin (`pnpm dev:admin` → http://localhost:5174)
2. Sign in with seeded super admin:
   - External user ID: `admin-gateway`
   - Role issued: `SUPER_ADMIN`

## Capabilities

| Section | Actions |
|---------|---------|
| Dashboard | Counts + metrics snapshot |
| Gifts | Create, search, deactivate |
| Coin Packages | View configured packages |
| Battles | List battle history/status |
| Users | List users + balances |
| Transactions | Gift sends + payments |
| Settings | System key/value JSON settings |

## Roles

- `SUPER_ADMIN` / `ADMIN` — full mutate
- `MODERATOR` / `ANALYST` — read admin APIs
- Ordinary `VIEWER` / `CREATOR` — denied

## Gift assets

Upload icons/animations via storage adapter (local `/uploads` or S3). Set `iconUrl`, `animationUrl`, `animationType` (`LOTTIE`, `SVGA`, `GIF`, `MP4`, `WEBM`, `IMAGE`, `NONE`).

## Battle defaults

Setting key `battle_defaults`:

```json
{ "durationSeconds": 300, "scoreMultiplier": 1, "minParticipants": 2, "maxParticipants": 2 }
```

## Audit

Mutating admin actions write `AuditLog` rows (`GIFT_CREATE`, `WALLET_ADJUST`, etc.).
