import type { RealtimeEvent } from "@gateway/shared";

export type LivestreamSession = {
  externalId: string;
  provider: string;
  channelId?: string;
  hostUserId?: string;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "UNKNOWN";
  metadata?: Record<string, unknown>;
};

export interface LivestreamProvider {
  readonly name: string;
  resolveSession(externalId: string): Promise<LivestreamSession>;
  broadcastEvent(externalId: string, event: RealtimeEvent): Promise<void>;
}
