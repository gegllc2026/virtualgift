export const WALLET_TX_TYPES = {
  PURCHASE: "PURCHASE",
  GIFT_SENT: "GIFT_SENT",
  GIFT_RECEIVED: "GIFT_RECEIVED",
  REFUND: "REFUND",
  ADMIN_ADJUSTMENT: "ADMIN_ADJUSTMENT",
  BONUS: "BONUS",
  REVERSAL: "REVERSAL",
} as const;

export type WalletTxType = (typeof WALLET_TX_TYPES)[keyof typeof WALLET_TX_TYPES];

export const BATTLE_STATUSES = {
  CREATED: "CREATED",
  WAITING: "WAITING",
  STARTING: "STARTING",
  ACTIVE: "ACTIVE",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
} as const;

export type BattleStatus = (typeof BATTLE_STATUSES)[keyof typeof BATTLE_STATUSES];

export const ANIMATION_TYPES = {
  LOTTIE: "LOTTIE",
  SVGA: "SVGA",
  GIF: "GIF",
  MP4: "MP4",
  WEBM: "WEBM",
  IMAGE: "IMAGE",
  NONE: "NONE",
} as const;

export type AnimationType = (typeof ANIMATION_TYPES)[keyof typeof ANIMATION_TYPES];

export const REALTIME_EVENT_VERSION = 1 as const;

export const DEFAULT_BATTLE_DURATION_SECONDS = 300;
export const DEFAULT_SCORE_MULTIPLIER = 1;
