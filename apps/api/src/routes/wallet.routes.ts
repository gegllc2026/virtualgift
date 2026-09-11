import type { FastifyInstance } from "fastify";
import { successResponse, paginationSchema } from "@gateway/shared";
import { getWalletBalance } from "@gateway/core";
import { authenticate, getUser } from "../auth.js";
import { asDb } from "../db.js";

export async function walletRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: authenticate }, async (req) => {
    const user = getUser(req);
    const wallet = await getWalletBalance(asDb(app.prisma), user.sub);
    return successResponse({ wallet });
  });

  app.get("/transactions", { preHandler: authenticate }, async (req) => {
    const user = getUser(req);
    const page = paginationSchema.parse(req.query);
    const where = { userId: user.sub };
    const [items, total] = await Promise.all([
      app.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      app.prisma.walletTransaction.count({ where }),
    ]);
    return successResponse({ items, total, page: page.page, pageSize: page.pageSize });
  });
}
