# Agora Integration

## Scope

The host application owns **Agora RTC** (audio/video). This plugin:

- Stores a `Livestream` row keyed by `(provider, externalLivestreamId)`
- Broadcasts gifting/battle events on a **realtime channel** (Socket.IO by default)
- Optionally bridges the same events through an **Agora RTM** adapter

It must **not** interrupt or reconfigure the Agora A/V pipeline.

## Adapter

`AgoraLivestreamAdapter` implements `LivestreamProvider`:

- `resolveSession(externalId)` — returns channel metadata
- `broadcastEvent(externalId, event)` — forwards to RTM provider if configured
- `buildRtcToken(...)` — optional helper; prefer minting tokens in your own secure backend

## Configuration

```
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
AGORA_RTM_ENABLED=false
REALTIME_PROVIDER=socket   # or agora-rtm
```

When `PROVIDERS_MODE=live` and `AGORA_APP_ID` is set, the API wires `AgoraLivestreamAdapter`.

## Host flow

1. Create / join Agora RTC channel as you do today.
2. Call `POST /api/livestreams/ensure` with `externalLivestreamId = channelId`.
3. Subscribe the UI to `livestream:{internalId}` (SDK) for gift/battle overlays.
4. Keep RTC connected independently of gift WebSocket lifecycle.

## RTM note

`AgoraRtmRealtimeProvider` is an adapter seam. Wire the official Agora RTM SDK or REST in that class when you enable RTM in production — core gift/battle engines stay unchanged.
