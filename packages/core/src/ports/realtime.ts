import type { RealtimeEvent } from "@gateway/shared";

export interface RealtimeProvider {
  readonly name: string;
  publish(channel: string, event: RealtimeEvent): Promise<void>;
  subscribe(
    channel: string,
    handler: (event: RealtimeEvent) => void,
  ): Promise<() => void>;
  close?(): Promise<void>;
}

export function livestreamChannel(livestreamId: string): string {
  return `livestream:${livestreamId}`;
}

export function userChannel(userId: string): string {
  return `user:${userId}`;
}

export function battleChannel(battleId: string): string {
  return `battle:${battleId}`;
}
