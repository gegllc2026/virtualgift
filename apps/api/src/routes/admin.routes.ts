import type { FastifyInstance } from "fastify";
import {
  createGiftSchema,
  updateGiftSchema,
  createCoinPackageSchema,
  updateCoinPackageSchema,
  createCategorySchema,
  walletAdjustSchema,
  paginationSchema,
  successResponse,
  WALLET_TX_TYPES,
} from "@gateway/shared";
import { creditCoins, debitCoins, metrics } from "@gateway/core";
import { requireAdmin, requireAdminMutate, getUser } from "../auth.js";
import { asDb } from "../db.js";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/dashboard", async () => {
    const [users, gifts, giftSends, payments, activeBattles] = await Promise.all([
      app.prisma.user.count(),
      app.prisma.gift.count({ where: { isActive: true } }),
      app.prisma.giftSend.count(),
      app.prisma.payment.count({ where: { status: "SUCCEEDED" } }),
      app.prisma.battle.count({ where: { status: "ACTIVE" } }),
    ]);
    return successResponse({
      users,
      gifts,
      giftSends,
      payments,
      activeBattles,
      metrics: metrics.snapshot(),
    });
  });

  // —— Gifts ——
  app.get("/gifts", async (req) => {
    const page = paginationSchema.parse(req.query);
    const q = (req.query as { search?: string }).search;
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      app.prisma.gift.findMany({
        where,
        include: { category: true },
        orderBy: { sortOrder: "asc" },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      app.prisma.gift.count({ where }),
    ]);
    return successResponse({ items, total, page: page.page, pageSize: page.pageSize });
  });

  app.post("/gifts", { preHandler: requireAdminMutate }, async (req) => {
    const body = createGiftSchema.parse(req.body);
    const gift = await app.prisma.gift.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        categoryId: body.categoryId ?? undefined,
        coinCost: body.coinCost,
        iconUrl: body.iconUrl ?? undefined,
        animationUrl: body.animationUrl ?? undefined,
        animationType: body.animationType,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        metadata: body.metadata ? (body.metadata as object) : undefined,
      },
    });
    await app.prisma.auditLog.create({
      data: {
        actorId: getUser(req).sub,
        action: "GIFT_CREATE",
        entityType: "Gift",
        entityId: gift.id,
        metadata: { name: body.name, slug: body.slug, coinCost: body.coinCost },
      },
    });
    return successResponse({ gift });
  });

  app.patch("/gifts/:id", { preHandler: requireAdminMutate }, async (req) => {
    const { id } = req.params as { id: string };
    const body = updateGiftSchema.parse(req.body);
    const gift = await app.prisma.gift.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.coinCost !== undefined ? { coinCost: body.coinCost } : {}),
        ...(body.iconUrl !== undefined ? { iconUrl: body.iconUrl } : {}),
        ...(body.animationUrl !== undefined ? { animationUrl: body.animationUrl } : {}),
        ...(body.animationType !== undefined ? { animationType: body.animationType } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.metadata !== undefined ? { metadata: body.metadata as object } : {}),
      },
    });
    await app.prisma.auditLog.create({
      data: {
        actorId: getUser(req).sub,
        action: "GIFT_UPDATE",
        entityType: "Gift",
        entityId: id,
        metadata: { updated: Object.keys(body) },
      },
    });
    return successResponse({ gift });
  });

  app.delete("/gifts/:id", { preHandler: requireAdminMutate }, async (req) => {
    const { id } = req.params as { id: string };
    const gift = await app.prisma.gift.update({
      where: { id },
      data: { isActive: false },
    });
    await app.prisma.auditLog.create({
      data: {
        actorId: getUser(req).sub,
        action: "GIFT_DEACTIVATE",
        entityType: "Gift",
        entityId: id,
      },
    });
    return successResponse({ gift });
  });

  // —— Categories ——
  app.get("/categories", async () => {
    const categories = await app.prisma.giftCategory.findMany({ orderBy: { sortOrder: "asc" } });
    return successResponse({ categories });
  });

  app.post("/categories", { preHandler: requireAdminMutate }, async (req) => {
    const body = createCategorySchema.parse(req.body);
    const category = await app.prisma.giftCategory.create({ data: body });
    return successResponse({ category });
  });

  // —— Coin packages ——
  app.get("/coin-packages", async () => {
    const packages = await app.prisma.coinPackage.findMany({ orderBy: { sortOrder: "asc" } });
    return successResponse({ packages });
  });

  app.post("/coin-packages", { preHandler: requireAdminMutate }, async (req) => {
    const body = createCoinPackageSchema.parse(req.body);
    const coinPackage = await app.prisma.coinPackage.create({ data: body });
    return successResponse({ coinPackage });
  });

  app.patch("/coin-packages/:id", { preHandler: requireAdminMutate }, async (req) => {
    const { id } = req.params as { id: string };
    const body = updateCoinPackageSchema.parse(req.body);
    const coinPackage = await app.prisma.coinPackage.update({ where: { id }, data: body });
    return successResponse({ coinPackage });
  });

  // —— Wallet adjustments ——
  app.post("/wallet/adjust", { preHandler: requireAdminMutate }, async (req) => {
    const body = walletAdjustSchema.parse(req.body);
    const result =
      body.amount >= 0
        ? await creditCoins(asDb(app.prisma), {
            userId: body.userId,
            amount: body.amount,
            type: WALLET_TX_TYPES.ADMIN_ADJUSTMENT,
            reference: `admin-adj:${body.idempotencyKey}`,
            metadata: { reason: body.reason, actorId: getUser(req).sub },
          })
        : await debitCoins(asDb(app.prisma), {
            userId: body.userId,
            amount: Math.abs(body.amount),
            type: WALLET_TX_TYPES.ADMIN_ADJUSTMENT,
            reference: `admin-adj:${body.idempotencyKey}`,
            metadata: { reason: body.reason, actorId: getUser(req).sub },
          });
    await app.prisma.auditLog.create({
      data: {
        actorId: getUser(req).sub,
        action: "WALLET_ADJUST",
        entityType: "Wallet",
        entityId: result.wallet.id,
        metadata: body,
      },
    });
    return successResponse(result);
  });

  // —— Users ——
  app.get("/users", async (req) => {
    const page = paginationSchema.parse(req.query);
    const [items, total] = await Promise.all([
      app.prisma.user.findMany({
        include: { wallet: true },
        orderBy: { createdAt: "desc" },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      app.prisma.user.count(),
    ]);
    return successResponse({ items, total, page: page.page, pageSize: page.pageSize });
  });

  // —— Transactions / payments ——
  app.get("/payments", async (req) => {
    const page = paginationSchema.parse(req.query);
    const [items, total] = await Promise.all([
      app.prisma.payment.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      app.prisma.payment.count(),
    ]);
    return successResponse({ items, total, page: page.page, pageSize: page.pageSize });
  });

  app.get("/gift-transactions", async (req) => {
    const page = paginationSchema.parse(req.query);
    const [items, total] = await Promise.all([
      app.prisma.giftSend.findMany({
        include: {
          gift: true,
          sender: { select: { displayName: true, id: true } },
          receiver: { select: { displayName: true, id: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      app.prisma.giftSend.count(),
    ]);
    return successResponse({ items, total, page: page.page, pageSize: page.pageSize });
  });

  // —— Battles ——
  app.get("/battles", async (req) => {
    const page = paginationSchema.parse(req.query);
    const status = (req.query as { status?: string }).status;
    const where = status ? { status: status as never } : {};
    const [items, total] = await Promise.all([
      app.prisma.battle.findMany({
        where,
        include: { participants: true },
        orderBy: { createdAt: "desc" },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
      }),
      app.prisma.battle.count({ where }),
    ]);
    return successResponse({ items, total, page: page.page, pageSize: page.pageSize });
  });

  // —— Settings ——
  app.get("/settings", async () => {
    const settings = await app.prisma.systemSetting.findMany();
    return successResponse({ settings });
  });

  app.put("/settings/:key", { preHandler: requireAdminMutate }, async (req) => {
    const { key } = req.params as { key: string };
    const body = req.body as { value: unknown };
    const setting = await app.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: body.value as object },
      update: { value: body.value as object },
    });
    await app.prisma.auditLog.create({
      data: {
        actorId: getUser(req).sub,
        action: "SETTING_UPDATE",
        entityType: "SystemSetting",
        entityId: setting.id,
        metadata: { key, value: body.value as object },
      },
    });
    return successResponse({ setting });
  });

  // —— Analytics ——
  app.get("/analytics", async () => {
    const topGifts = await app.prisma.giftSend.groupBy({
      by: ["giftId"],
      _sum: { totalCost: true, quantity: true },
      orderBy: { _sum: { totalCost: "desc" } },
      take: 10,
    });
    return successResponse({
      metrics: metrics.snapshot(),
      topGifts,
    });
  });
}
