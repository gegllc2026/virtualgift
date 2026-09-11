import {
  AppError,
  ERROR_CODES,
  WALLET_TX_TYPES,
  createEventId,
  REALTIME_EVENT_VERSION,
  type GiftSentEvent,
  type WalletUpdatedEvent,
} from "@gateway/shared";
import type { DbClient } from "../ports/db.js";
import type { RealtimeProvider } from "../ports/realtime.js";
import { battleChannel, livestreamChannel, userChannel } from "../ports/realtime.js";
import type { BattleScoringStrategy } from "../ports/scoring.js";
import { DefaultCoinScoringStrategy } from "../ports/scoring.js";
import { beginIdempotent, debitCoins } from "../wallet/index.js";
import { applyGiftToBattle } from "../battle/scoring-apply.js";
import { metrics } from "../metrics.js";

export type GiftRecord = {
  id: string;
  name: string;
  slug: string;
  coinCost: number;
  iconUrl: string | null;
  animationUrl: string | null;
  animationType: string;
  isActive: boolean;
};

export type UserRecord = {
  id: string;
  displayName: string;
  avatar: string | null;
  status: string;
};

export type SendGiftParams = {
  senderId: string;
  receiverId: string;
  giftId: string;
  livestreamId: string;
  quantity: number;
  battleId?: string;
  idempotencyKey: string;
};

export type SendGiftResult = {
  giftSend: {
    id: string;
    giftId: string;
    senderId: string;
    receiverId: string;
    livestreamId: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    battleId: string | null;
  };
  walletBalance: number;
  events: Array<GiftSentEvent | WalletUpdatedEvent>;
  battle?: {
    battleId: string;
    participants: Array<{ userId: string; score: number; giftCount: number }>;
    points: number;
  };
};

function hashRequest(params: SendGiftParams): string {
  return [
    params.senderId,
    params.receiverId,
    params.giftId,
    params.livestreamId,
    params.quantity,
    params.battleId ?? "",
  ].join("|");
}

export async function listActiveGifts(db: DbClient, categoryId?: string) {
  return db.gift.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { coinCost: "asc" }],
  });
}

export async function sendGift(
  db: DbClient,
  realtime: RealtimeProvider | null,
  params: SendGiftParams,
  scoring: BattleScoringStrategy = new DefaultCoinScoringStrategy(),
): Promise<SendGiftResult> {
  const { result } = await beginIdempotent(
    db,
    params.senderId,
    params.idempotencyKey,
    hashRequest(params),
    async () => executeSendGift(db, realtime, params, scoring),
  );
  return result;
}

async function executeSendGift(
  db: DbClient,
  realtime: RealtimeProvider | null,
  params: SendGiftParams,
  scoring: BattleScoringStrategy,
): Promise<SendGiftResult> {
  if (params.quantity < 1) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Quantity must be at least 1.");
  }
  if (params.senderId === params.receiverId) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Cannot send a gift to yourself.");
  }

  const gift = (await db.gift.findUnique({
    where: { id: params.giftId },
  })) as GiftRecord | null;

  if (!gift || !gift.isActive) {
    metrics.inc("gift_failed_total");
    throw new AppError(ERROR_CODES.GIFT_UNAVAILABLE, "This gift is unavailable.", 404);
  }

  const sender = (await db.user.findUnique({
    where: { id: params.senderId },
  })) as UserRecord | null;
  const receiver = (await db.user.findUnique({
    where: { id: params.receiverId },
  })) as UserRecord | null;

  if (!sender || sender.status !== "ACTIVE") {
    throw new AppError(ERROR_CODES.USER_INACTIVE, "Sender is not active.", 403);
  }
  if (!receiver || receiver.status !== "ACTIVE") {
    throw new AppError(ERROR_CODES.USER_INACTIVE, "Receiver is not active.", 403);
  }

  const livestream = await db.livestream.findUnique({
    where: { id: params.livestreamId },
  });
  if (!livestream) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Livestream not found.", 404);
  }

  const unitCost = gift.coinCost;
  const totalCost = unitCost * params.quantity;
  const reference = `gift:${params.idempotencyKey}`;

  // Viewer spendable coins are debited. Creator earnings are recorded on GiftSend
  // (and optional GIFT_RECEIVED ledger via admin settlement), not auto-credited
  // as spendable coins — matching typical livestream economies.
  const { wallet } = await debitCoins(db, {
    userId: params.senderId,
    amount: totalCost,
    type: WALLET_TX_TYPES.GIFT_SENT,
    reference,
    metadata: {
      giftId: gift.id,
      receiverId: params.receiverId,
      quantity: params.quantity,
    },
  });

  const giftSend = (await db.giftSend.create({
    data: {
      giftId: gift.id,
      senderId: params.senderId,
      receiverId: params.receiverId,
      livestreamId: params.livestreamId,
      battleId: params.battleId ?? null,
      quantity: params.quantity,
      unitCost,
      totalCost,
      status: "COMPLETED",
    },
  })) as SendGiftResult["giftSend"];

  let battleResult: SendGiftResult["battle"];

  if (params.battleId) {
    const battle = (await db.battle.findUnique({
      where: { id: params.battleId },
    })) as { scoreMultiplier: number } | null;
    const multiplier = battle?.scoreMultiplier ?? 1;
    const points = scoring.calculatePoints(unitCost, params.quantity, multiplier);
    const applied = await applyGiftToBattle(db, {
      battleId: params.battleId,
      receiverId: params.receiverId,
      senderId: params.senderId,
      giftId: gift.id,
      points,
      quantity: params.quantity,
    });
    battleResult = {
      battleId: params.battleId,
      participants: applied.participants,
      points,
    };
  }

  const ts = new Date().toISOString();
  const giftEvent: GiftSentEvent = {
    v: REALTIME_EVENT_VERSION,
    id: createEventId(),
    type: "gift.sent",
    timestamp: ts,
    livestreamId: params.livestreamId,
    giftId: gift.id,
    giftName: gift.name,
    giftIconUrl: gift.iconUrl,
    animationType: gift.animationType,
    animationUrl: gift.animationUrl,
    senderId: params.senderId,
    senderName: sender.displayName,
    senderAvatar: sender.avatar,
    receiverId: params.receiverId,
    quantity: params.quantity,
    unitCost,
    totalCoins: totalCost,
    giftSendId: giftSend.id,
    battleId: params.battleId,
  };

  const walletEvent: WalletUpdatedEvent = {
    v: REALTIME_EVENT_VERSION,
    id: createEventId(),
    type: "wallet.updated",
    timestamp: ts,
    userId: params.senderId,
    balance: wallet.balance,
    currency: wallet.currency,
    reason: "GIFT_SENT",
  };

  const events = [giftEvent, walletEvent] as Array<GiftSentEvent | WalletUpdatedEvent>;

  if (realtime) {
    await Promise.all([
      realtime.publish(livestreamChannel(params.livestreamId), giftEvent),
      realtime.publish(userChannel(params.senderId), walletEvent),
      ...(params.battleId && battleResult
        ? [
            realtime.publish(battleChannel(params.battleId), {
              v: REALTIME_EVENT_VERSION,
              id: createEventId(),
              type: "battle.score_updated" as const,
              timestamp: ts,
              livestreamId: params.livestreamId,
              battleId: params.battleId,
              participants: battleResult.participants,
              lastGift: {
                senderId: params.senderId,
                receiverId: params.receiverId,
                giftId: gift.id,
                points: battleResult.points,
              },
            }),
          ]
        : []),
    ]);
  }

  metrics.inc("gift_sent_total");

  return {
    giftSend: { ...giftSend, battleId: giftSend.battleId ?? null },
    walletBalance: wallet.balance,
    events,
    battle: battleResult,
  };
}
