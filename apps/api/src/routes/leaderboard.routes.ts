import type { FastifyInstance } from "fastify";
import { successResponse } from "@gateway/shared";
import {
  getBattleLeaderboard,
  getLivestreamGiftLeaderboard,
  refreshPeriodLeaderboard,
} from "@gateway/core";
import { asDb } from "../db.js";

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get("/battle/:battleId", async (req) => {
    const { battleId } = req.params as { battleId: string };
    const entries = await getBattleLeaderboard(asDb(app.prisma), battleId);
    return successResponse({ entries });
  });

  app.get("/livestream/:livestreamId", async (req) => {
    const { livestreamId } = req.params as { livestreamId: string };
    const entries = await getLivestreamGiftLeaderboard(asDb(app.prisma), livestreamId);
    return successResponse({ entries });
  });

  app.get("/period/:scope", async (req) => {
    const { scope } = req.params as { scope: "daily" | "weekly" | "monthly" };
    const entries = await refreshPeriodLeaderboard(asDb(app.prisma), scope);
    return successResponse({ entries, scope });
  });
}
