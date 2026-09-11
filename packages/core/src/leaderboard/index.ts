import type { DbClient } from "../ports/db.js";

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  avatar: string | null;
  score: number;
  rank: number;
};

export async function getBattleLeaderboard(
  db: DbClient,
  battleId: string,
): Promise<LeaderboardEntry[]> {
  const participants = (await db.battleParticipant.findMany({
    where: { battleId },
    orderBy: { score: "desc" },
    include: { user: { select: { displayName: true, avatar: true } } },
  })) as Array<{
    userId: string;
    score: number;
    user?: { displayName: string; avatar: string | null };
  }>;

  return participants.map((p, idx) => ({
    userId: p.userId,
    displayName: p.user?.displayName ?? p.userId,
    avatar: p.user?.avatar ?? null,
    score: p.score,
    rank: idx + 1,
  }));
}

export async function getLivestreamGiftLeaderboard(
  db: DbClient,
  livestreamId: string,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const grouped = (await db.giftSend.groupBy({
    by: ["senderId"],
    where: { livestreamId, status: "COMPLETED" },
    _sum: { totalCost: true },
    orderBy: { _sum: { totalCost: "desc" } },
    take: limit,
  })) as Array<{ senderId: string; _sum: { totalCost: number | null } }>;

  const entries: LeaderboardEntry[] = [];
  let rank = 1;
  for (const row of grouped) {
    const user = (await db.user.findUnique({
      where: { id: row.senderId },
    })) as { displayName: string; avatar: string | null } | null;
    entries.push({
      userId: row.senderId,
      displayName: user?.displayName ?? row.senderId,
      avatar: user?.avatar ?? null,
      score: row._sum.totalCost ?? 0,
      rank: rank++,
    });
  }
  return entries;
}

function periodKey(scope: "daily" | "weekly" | "monthly", date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  if (scope === "daily") return `${y}-${m}-${d}`;
  if (scope === "monthly") return `${y}-${m}`;
  const onejan = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil(((date.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}

export async function refreshPeriodLeaderboard(
  db: DbClient,
  scope: "daily" | "weekly" | "monthly",
  scopeId = "global",
): Promise<LeaderboardEntry[]> {
  const key = periodKey(scope);
  const now = new Date();
  let from: Date;
  if (scope === "daily") {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (scope === "monthly") {
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  } else {
    const day = now.getUTCDay();
    from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  }

  const grouped = (await db.giftSend.groupBy({
    by: ["senderId"],
    where: { status: "COMPLETED", createdAt: { gte: from } },
    _sum: { totalCost: true },
    orderBy: { _sum: { totalCost: "desc" } },
    take: 50,
  })) as Array<{ senderId: string; _sum: { totalCost: number | null } }>;

  const entries: LeaderboardEntry[] = [];
  let rank = 1;
  for (const row of grouped) {
    const user = (await db.user.findUnique({
      where: { id: row.senderId },
    })) as { displayName: string; avatar: string | null } | null;
    entries.push({
      userId: row.senderId,
      displayName: user?.displayName ?? row.senderId,
      avatar: user?.avatar ?? null,
      score: row._sum.totalCost ?? 0,
      rank: rank++,
    });
  }

  await db.leaderboardSnapshot.upsert({
    where: {
      scope_scopeId_periodKey: { scope, scopeId, periodKey: key },
    },
    create: { scope, scopeId, periodKey: key, entries },
    update: { entries },
  });

  return entries;
}
