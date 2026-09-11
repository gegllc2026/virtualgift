# Realtime Events

All events include:

```ts
{
  v: 1,
  id: string,
  timestamp: string, // ISO
  livestreamId?: string
}
```

Clients should join Socket.IO rooms:

- `livestream:{livestreamId}`
- `user:{userId}`
- `battle:{battleId}`

Server emits both `gateway.event` and the specific `event.type`.

## Event types

### `gift.sent`

Gift overlay payload: gift identity, sender, quantity, costs, optional animation URLs, optional `battleId`.

### `wallet.updated`

`userId`, `balance`, `currency`, `reason`.

### `battle.started`

Participants, `durationSeconds`, `endsAt`.

### `battle.score_updated`

Participant scores + optional `lastGift` points.

### `battle.ended`

`winnerId` (nullable), `isDraw`, final scores.

### `leaderboard.updated`

Scope + ranked entries (when emitted by future jobs/UI refresh hooks).

## Versioning

Field `v` is currently `1`. Additive fields are backward compatible; breaking changes bump `v`.
