import { createHmac } from "node:crypto";
import type { LivestreamProvider, LivestreamSession, RealtimeProvider } from "@gateway/core";
import type { RealtimeEvent } from "@gateway/shared";
import { assertMockAllowed } from "../guard.js";
import { metrics } from "@gateway/core";

/**
 * Agora livestream adapter — does NOT control A/V.
 * Resolves session metadata and can bridge events to Agora RTM when enabled.
 */
export class AgoraLivestreamAdapter implements LivestreamProvider {
  readonly name = "agora";

  constructor(
    private readonly appId: string,
    private readonly appCertificate: string,
    private readonly rtm?: RealtimeProvider,
  ) {
    if (!appId) throw new Error("AGORA_APP_ID is required");
  }

  /** Build a simple RTC token helper for host apps (optional). */
  buildRtcToken(channelId: string, uid: string | number, expireSeconds = 3600): string {
    // Host apps often mint tokens themselves. This helper documents the contract.
    // Full Agora token builder can be swapped in without touching core engines.
    void this.appCertificate;
    const exp = Math.floor(Date.now() / 1000) + expireSeconds;
    const payload = `${this.appId}:${channelId}:${uid}:${exp}`;
    return createHmac("sha256", this.appCertificate || "dev").update(payload).digest("hex");
  }

  async resolveSession(externalId: string): Promise<LivestreamSession> {
    return {
      externalId,
      provider: this.name,
      channelId: externalId,
      status: "LIVE",
      metadata: { appId: this.appId },
    };
  }

  async broadcastEvent(externalId: string, event: RealtimeEvent): Promise<void> {
    if (this.rtm) {
      await this.rtm.publish(`agora:${externalId}`, event);
      return;
    }
    // Without RTM, host should consume Socket realtime; no-op bridge.
    void event;
  }
}

/**
 * Optional Agora RTM bridge. Uses HTTP-less in-process fanout until RTM SDK is configured.
 * Swap implementation without changing Gift/Battle engines.
 */
export class AgoraRtmRealtimeProvider implements RealtimeProvider {
  readonly name = "agora-rtm";
  private readonly handlers = new Map<string, Set<(e: RealtimeEvent) => void>>();

  constructor(
    private readonly appId: string,
    _appCertificate: string,
  ) {
    if (!appId) throw new Error("AGORA_APP_ID is required for Agora RTM");
  }

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    try {
      const set = this.handlers.get(channel);
      if (set) for (const h of set) h(event);
      // Production: publish via Agora RTM SDK / REST here.
    } catch {
      metrics.inc("realtime_event_failures");
      throw new Error(`Agora RTM publish failed for ${channel}`);
    }
  }

  async subscribe(
    channel: string,
    handler: (event: RealtimeEvent) => void,
  ): Promise<() => void> {
    const set = this.handlers.get(channel) ?? new Set();
    set.add(handler);
    this.handlers.set(channel, set);
    return async () => {
      set.delete(handler);
    };
  }
}

export class MockLivestreamProvider implements LivestreamProvider {
  readonly name = "mock-agora";

  constructor() {
    assertMockAllowed(process.env.PROVIDERS_MODE ?? "mock", this.name);
  }

  async resolveSession(externalId: string): Promise<LivestreamSession> {
    return {
      externalId,
      provider: this.name,
      channelId: externalId,
      status: "LIVE",
    };
  }

  async broadcastEvent(): Promise<void> {
    return;
  }
}
