import type { RealtimeEvent } from "@gateway/shared";
import type { RealtimeProvider } from "@gateway/core";
import { metrics } from "@gateway/core";
import { assertMockAllowed } from "../guard.js";

type ServerLike = {
  to(room: string): { emit(event: string, payload: unknown): void };
  on?(event: string, handler: (...args: unknown[]) => void): void;
};

/**
 * Socket.IO backed realtime. Pass the Server instance from apps/api.
 */
export class SocketRealtimeProvider implements RealtimeProvider {
  readonly name = "socket.io";

  constructor(private readonly io: ServerLike) {}

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    try {
      this.io.to(channel).emit("gateway.event", event);
      this.io.to(channel).emit(event.type, event);
    } catch {
      metrics.inc("realtime_event_failures");
      throw new Error(`Failed to publish realtime event to ${channel}`);
    }
  }

  async subscribe(
    channel: string,
    _handler: (event: RealtimeEvent) => void,
  ): Promise<() => void> {
    // Server-side subscribe is a no-op; clients join rooms via WS handshake.
    void channel;
    return async () => undefined;
  }
}

export class MockRealtimeProvider implements RealtimeProvider {
  readonly name = "mock-realtime";
  readonly published: Array<{ channel: string; event: RealtimeEvent }> = [];
  private handlers = new Map<string, Set<(e: RealtimeEvent) => void>>();

  constructor() {
    assertMockAllowed(process.env.PROVIDERS_MODE ?? "mock", this.name);
  }

  async publish(channel: string, event: RealtimeEvent): Promise<void> {
    this.published.push({ channel, event });
    const set = this.handlers.get(channel);
    if (set) {
      for (const h of set) h(event);
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
