import type { FastifyInstance } from "fastify";
import { createBattleSchema, successResponse } from "@gateway/shared";
import { createBattle, startBattle, endBattle, cancelBattle, getBattle } from "@gateway/core";
import { authenticate, requireRoles } from "../auth.js";
import { asDb } from "../db.js";

export async function battleRoutes(app: FastifyInstance) {
  app.post("/", { preHandler: authenticate }, async (req) => {
    const body = createBattleSchema.parse(req.body);
    const battle = await createBattle(asDb(app.prisma), body);
    return successResponse({ battle });
  });

  app.get("/:id", { preHandler: authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const battle = await getBattle(asDb(app.prisma), id);
    return successResponse({ battle });
  });

  app.post("/:id/start", { preHandler: authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const battle = await startBattle(asDb(app.prisma), app.providers.realtime, id);
    return successResponse({ battle });
  });

  app.post("/:id/end", { preHandler: authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const battle = await endBattle(asDb(app.prisma), app.providers.realtime, id);
    return successResponse({ battle });
  });

  app.post(
    "/:id/cancel",
    { preHandler: requireRoles("ADMIN", "SUPER_ADMIN", "CREATOR") },
    async (req) => {
      const { id } = req.params as { id: string };
      const battle = await cancelBattle(asDb(app.prisma), id);
      return successResponse({ battle });
    },
  );
}
