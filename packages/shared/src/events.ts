import { REALTIME_EVENT_VERSION } from "./constants.js";

export type RealtimeEventBase = {
  v: typeof REALTIME_EVENT_VERSION;
  id: string;
  timestamp: string;
  livestreamId?: string;
};

export type GiftSentEvent = RealtimeEventBase & {
  type: "gift.sent";
  giftId: string;
  giftName: string;
  giftIconUrl: string | null;
  animationType: string;
  animationUrl: string | null;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  receiverId: string;
  quantity: number;
  unitCost: number;
  totalCoins: number;
  giftSendId: string;
  battleId?: string;
};

export type WalletUpdatedEvent = RealtimeEventBase & {
  type: "wallet.updated";
  userId: string;
  balance: number;
  currency: string;
  reason: string;
};

export type BattleStartedEvent = RealtimeEventBase & {
  type: "battle.started";
  battleId: string;
  durationSeconds: number;
  endsAt: string;
  participants: Array<{ userId: string; displayName: string; score: number }>;
};

export type BattleScoreUpdatedEvent = RealtimeEventBase & {
  type: "battle.score_updated";
  battleId: string;
  participants: Array<{ userId: string; score: number; giftCount: number }>;
  lastGift?: {
    senderId: string;
    receiverId: string;
    giftId: string;
    points: number;
  };
};

export type BattleEndedEvent = RealtimeEventBase & {
  type: "battle.ended";
  battleId: string;
  winnerId: string | null;
  isDraw: boolean;
  participants: Array<{ userId: string; score: number }>;
};

export type LeaderboardUpdatedEvent = RealtimeEventBase & {
  type: "leaderboard.updated";
  scope: "battle" | "livestream" | "daily" | "weekly" | "monthly" | "creator";
  scopeId: string;
  entries: Array<{
    userId: string;
    displayName: string;
    avatar: string | null;
    score: number;
    rank: number;
  }>;
};

export type RealtimeEvent =
  | GiftSentEvent
  | WalletUpdatedEvent
  | BattleStartedEvent
  | BattleScoreUpdatedEvent
  | BattleEndedEvent
  | LeaderboardUpdatedEvent;

export type RealtimeEventType = RealtimeEvent["type"];

export function createEventId(): string {
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
