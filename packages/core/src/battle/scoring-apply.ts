import { AppError, ERROR_CODES, BATTLE_STATUSES } from "@gateway/shared";
import type { DbClient } from "../ports/db.js";

export type BattleParticipantRow = {
  id: string;
  battleId: string;
  userId: string;
  score: number;
  giftCount: number;
  status: string;
};

export type BattleRow = {
  id: string;
  livestreamId: string;
  status: string;
  duration: number;
  scoreMultiplier: number;
  startTime: Date | null;
  endTime: Date | null;
  winnerId: string | null;
};

/**
 * Apply scored gift points to the gift receiver's battle participant row.
 * `points` should already include the configured scoring strategy + multiplier.
 */
export async function applyGiftToBattle(
  db: DbClient,
  input: {
    battleId: string;
    receiverId: string;
    senderId: string;
    giftId: string;
    points: number;
    quantity: number;
  },
): Promise<{ participants: Array<{ userId: string; score: number; giftCount: number }> }> {
  const battle = (await db.battle.findUnique({
    where: { id: input.battleId },
  })) as BattleRow | null;

  if (!battle) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Battle not found.", 404);
  }

  if (battle.status !== BATTLE_STATUSES.ACTIVE) {
    throw new AppError(
      ERROR_CODES.BATTLE_INVALID_STATE,
      "Gifts only score during an active battle.",
      409,
    );
  }

  const participant = (await db.battleParticipant.findUnique({
    where: {
      battleId_userId: { battleId: input.battleId, userId: input.receiverId },
    },
  })) as BattleParticipantRow | null;

  if (!participant) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "Gift receiver is not a battle participant.",
    );
  }

  const finalPoints = Math.max(0, Math.floor(input.points));

  await db.battleParticipant.update({
    where: { id: participant.id },
    data: {
      score: { increment: finalPoints },
      giftCount: { increment: input.quantity },
    },
  });

  await db.battleEvent.create({
    data: {
      battleId: input.battleId,
      userId: input.senderId,
      eventType: "GIFT_SCORE",
      giftId: input.giftId,
      points: finalPoints,
      metadata: { receiverId: input.receiverId, quantity: input.quantity },
    },
  });

  const participants = (await db.battleParticipant.findMany({
    where: { battleId: input.battleId },
    orderBy: { score: "desc" },
  })) as BattleParticipantRow[];

  return {
    participants: participants.map((p) => ({
      userId: p.userId,
      score: p.score,
      giftCount: p.giftCount,
    })),
  };
}
