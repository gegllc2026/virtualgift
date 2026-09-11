import type { FastifyInstance } from "fastify";
import { sendGiftSchema, successResponse, paginationSchema } from "@gateway/shared";
import { listActiveGifts, sendGift } from "@gateway/core";
import { authenticate, getUser } from "../auth.js";
import { asDb } from "../db.js";

export async function giftRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const query = req.query as { categoryId?: string };
    const gifts = await listActiveGifts(asDb(app.prisma), query.categoryId);
    const categories = await app.prisma.giftCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return successResponse({ gifts, categories });
  });

  app.get("/:id", async (req) => {
    const { id } = req.params as { id: string };
    const gift = await app.prisma.gift.findUnique({ where: { id } });
    return successResponse({ gift });
  });

  app.post("/send", { preHandler: authenticate }, async (req) => {
    const body = sendGiftSchema.parse(req.body);
    const user = getUser(req);
    const result = await sendGift(asDb(app.prisma), app.providers.realtime, {
      senderId: user.sub,
      receiverId: body.receiverId,
      giftId: body.giftId,
      livestreamId: body.livestreamId,
      quantity: body.quantity,
      battleId: body.battleId,
      idempotencyKey: body.idempotencyKey,
    });
    return successResponse(result);
  });

  app.get("/history/me", { preHandler: authenticate }, async (req) => {
    const user = getUser(req);
    const page = paginationSchema.parse(req.query);
    const where = { senderId: user.sub };
    const [items, total] = await Promise.all([
      app.prisma.giftSend.findMany({
        where,
        include: { gift: true, receiver: { select: { displayName: true, id: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      app.prisma.giftSend.count({ where }),
    ]);
    return successResponse({ items, total, page: page.page, pageSize: page.pageSize });
  });
}
