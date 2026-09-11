import {
  AppError,
  ERROR_CODES,
  BATTLE_STATUSES,
  DEFAULT_BATTLE_DURATION_SECONDS,
  DEFAULT_SCORE_MULTIPLIER,
  REALTIME_EVENT_VERSION,
  createEventId,
  type BattleEndedEvent,
  type BattleStartedEvent,
} from "@gateway/shared";
import type { DbClient } from "../ports/db.js";
import type { RealtimeProvider } from "../ports/realtime.js";
import { battleChannel, livestreamChannel } from "../ports/realtime.js";
import { metrics } from "../metrics.js";

export type CreateBattleInput = {
  livestreamId: string;
  participantIds: string[];
  durationSeconds?: number;
  scoreMultiplier?: number;
  battleType?: string;
  minParticipants?: number;
  maxParticipants?: number;
};

export type BattleDetail = {
  id: string;
  livestreamId: string;
  status: string;
  battleType: string;
  duration: number;
  scoreMultiplier: number;
  startTime: Date | null;
  endTime: Date | null;
  winnerId: string | null;
  participants: Array<{
    userId: string;
    score: number;
    giftCount: number;
    status: string;
    displayName?: string;
  }>;
};

export async function createBattle(
  db: DbClient,
  input: CreateBattleInput,
): Promise<BattleDetail> {
  const min = input.minParticipants ?? 2;
  const max = input.maxParticipants ?? 8;

  if (input.participantIds.length < min) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      `Battle requires at least ${min} participants.`,
    );
  }
  if (input.participantIds.length > max) {
    throw new AppError(ERROR_CODES.BATTLE_FULL, `Battle allows at most ${max} participants.`);
  }

  const unique = new Set(input.participantIds);
  if (unique.size !== input.participantIds.length) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Duplicate participants are not allowed.");
  }

  const livestream = await db.livestream.findUnique({ where: { id: input.livestreamId } });
  if (!livestream) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Livestream not found.", 404);
  }

  for (const userId of input.participantIds) {
    const user = (await db.user.findUnique({ where: { id: userId } })) as {
      id: string;
      status: string;
    } | null;
    if (!user || user.status !== "ACTIVE") {
      throw new AppError(ERROR_CODES.USER_INACTIVE, `Participant ${userId} is not active.`);
    }
  }

  const battle = (await db.battle.create({
    data: {
      livestreamId: input.livestreamId,
      status: BATTLE_STATUSES.WAITING,
      battleType: input.battleType ?? "PK",
      duration: input.durationSeconds ?? DEFAULT_BATTLE_DURATION_SECONDS,
      scoreMultiplier: input.scoreMultiplier ?? DEFAULT_SCORE_MULTIPLIER,
      settings: {
        minParticipants: min,
        maxParticipants: max,
      },
    },
  })) as { id: string; livestreamId: string; status: string; battleType: string; duration: number; scoreMultiplier: number; startTime: Date | null; endTime: Date | null; winnerId: string | null };

  await db.battleParticipant.createMany({
    data: input.participantIds.map((userId) => ({
      battleId: battle.id,
      userId,
      status: "JOINED",
      score: 0,
      giftCount: 0,
    })),
  });

  await db.battleEvent.create({
    data: {
      battleId: battle.id,
      eventType: "CREATED",
      points: 0,
      metadata: { participantIds: input.participantIds },
    },
  });

  return getBattle(db, battle.id);
}

export async function getBattle(db: DbClient, battleId: string): Promise<BattleDetail> {
  type BattleWithParticipants = {
    id: string;
    livestreamId: string;
    status: string;
    battleType: string;
    duration: number;
    scoreMultiplier: number;
    startTime: Date | null;
    endTime: Date | null;
    winnerId: string | null;
    participants: Array<{
      userId: string;
      score: number;
      giftCount: number;
      status: string;
      user?: { displayName: string };
    }>;
  };

  const battle = (await db.battle.findUnique({
    where: { id: battleId },
    include: {
      participants: {
        include: { user: { select: { displayName: true } } },
      },
    },
  })) as BattleWithParticipants | null;

  if (!battle) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Battle not found.", 404);
  }

  return {
    id: battle.id,
    livestreamId: battle.livestreamId,
    status: battle.status,
    battleType: battle.battleType,
    duration: battle.duration,
    scoreMultiplier: battle.scoreMultiplier,
    startTime: battle.startTime,
    endTime: battle.endTime,
    winnerId: battle.winnerId,
    participants: battle.participants.map((p) => ({
      userId: p.userId,
      score: p.score,
      giftCount: p.giftCount,
      status: p.status,
      displayName: p.user?.displayName,
    })),
  };
}

export async function startBattle(
  db: DbClient,
  realtime: RealtimeProvider | null,
  battleId: string,
): Promise<BattleDetail> {
  const battle = await getBattle(db, battleId);

  if (
    battle.status !== BATTLE_STATUSES.WAITING &&
    battle.status !== BATTLE_STATUSES.CREATED &&
    battle.status !== BATTLE_STATUSES.STARTING
  ) {
    throw new AppError(
      ERROR_CODES.BATTLE_INVALID_STATE,
      `Cannot start battle in status ${battle.status}.`,
      409,
    );
  }

  if (battle.participants.length < 2) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Need at least two participants.");
  }

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + battle.duration * 1000);

  await db.battle.update({
    where: { id: battleId },
    data: {
      status: BATTLE_STATUSES.ACTIVE,
      startTime,
      endTime,
    },
  });

  await db.battleParticipant.updateMany({
    where: { battleId },
    data: { status: "ACTIVE" },
  });

  await db.battleEvent.create({
    data: {
      battleId,
      eventType: "STARTED",
      points: 0,
      metadata: { startTime, endTime },
    },
  });

  const updated = await getBattle(db, battleId);
  metrics.inc("battle_started_total");

  if (realtime) {
    const event: BattleStartedEvent = {
      v: REALTIME_EVENT_VERSION,
      id: createEventId(),
      type: "battle.started",
      timestamp: new Date().toISOString(),
      livestreamId: updated.livestreamId,
      battleId: updated.id,
      durationSeconds: updated.duration,
      endsAt: endTime.toISOString(),
      participants: updated.participants.map((p) => ({
        userId: p.userId,
        displayName: p.displayName ?? p.userId,
        score: p.score,
      })),
    };
    await Promise.all([
      realtime.publish(battleChannel(battleId), event),
      realtime.publish(livestreamChannel(updated.livestreamId), event),
    ]);
  }

  return updated;
}

export async function endBattle(
  db: DbClient,
  realtime: RealtimeProvider | null,
  battleId: string,
): Promise<BattleDetail> {
  const battle = await getBattle(db, battleId);

  if (battle.status !== BATTLE_STATUSES.ACTIVE && battle.status !== BATTLE_STATUSES.STARTING) {
    throw new AppError(
      ERROR_CODES.BATTLE_INVALID_STATE,
      `Cannot end battle in status ${battle.status}.`,
      409,
    );
  }

  const sorted = [...battle.participants].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const second = sorted[1];
  const isDraw = Boolean(top && second && top.score === second.score);
  const winnerId = isDraw ? null : (top?.userId ?? null);

  await db.battle.update({
    where: { id: battleId },
    data: {
      status: BATTLE_STATUSES.FINISHED,
      endTime: new Date(),
      winnerId,
    },
  });

  await db.battleEvent.create({
    data: {
      battleId,
      eventType: "FINISHED",
      points: 0,
      userId: winnerId,
      metadata: { isDraw, scores: sorted.map((p) => ({ userId: p.userId, score: p.score })) },
    },
  });

  const updated = await getBattle(db, battleId);
  metrics.inc("battle_completed_total");

  if (realtime) {
    const event: BattleEndedEvent = {
      v: REALTIME_EVENT_VERSION,
      id: createEventId(),
      type: "battle.ended",
      timestamp: new Date().toISOString(),
      livestreamId: updated.livestreamId,
      battleId: updated.id,
      winnerId,
      isDraw,
      participants: updated.participants.map((p) => ({
        userId: p.userId,
        score: p.score,
      })),
    };
    await Promise.all([
      realtime.publish(battleChannel(battleId), event),
      realtime.publish(livestreamChannel(updated.livestreamId), event),
    ]);
  }

  return updated;
}

export async function cancelBattle(db: DbClient, battleId: string): Promise<BattleDetail> {
  const battle = await getBattle(db, battleId);
  if (battle.status === BATTLE_STATUSES.FINISHED) {
    throw new AppError(ERROR_CODES.BATTLE_INVALID_STATE, "Finished battles cannot be cancelled.");
  }
  await db.battle.update({
    where: { id: battleId },
    data: { status: BATTLE_STATUSES.CANCELLED, endTime: new Date() },
  });
  await db.battleEvent.create({
    data: { battleId, eventType: "CANCELLED", points: 0 },
  });
  return getBattle(db, battleId);
}

export * from "./scoring-apply.js";
