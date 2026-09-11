import type { FastifyInstance } from "fastify";
import { ensureUserSchema, loginSchema, successResponse } from "@gateway/shared";
import { authenticate, getUser } from "../auth.js";

export async function authRoutes(app: FastifyInstance) {
  /**
   * Dev/host bridge: ensure a user exists and issue a plugin JWT.
   * In production, prefer host-signed JWT exchange.
   */
  app.post("/login", async (req) => {
    const body = loginSchema.parse(req.body);
    const user = await app.prisma.user.upsert({
      where: { externalUserId: body.externalUserId },
      create: {
        externalUserId: body.externalUserId,
        username: body.username,
        displayName: body.displayName,
        avatar: body.avatar ?? null,
        role: body.role ?? "VIEWER",
      },
      update: {
        username: body.username,
        displayName: body.displayName,
        avatar: body.avatar ?? undefined,
        ...(body.role ? { role: body.role } : {}),
      },
    });

    await app.prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id, balance: 0, currency: "COIN" },
      update: {},
    });

    const token = await app.jwt.sign({
      sub: user.id,
      externalUserId: user.externalUserId,
      role: user.role,
      displayName: user.displayName,
    });

    return successResponse({
      token,
      user: {
        id: user.id,
        externalUserId: user.externalUserId,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        locale: user.locale,
      },
    });
  });

  app.post("/ensure-user", { preHandler: authenticate }, async (req) => {
    const body = ensureUserSchema.parse(req.body);
    const user = await app.prisma.user.upsert({
      where: { externalUserId: body.externalUserId },
      create: {
        externalUserId: body.externalUserId,
        username: body.username,
        displayName: body.displayName,
        avatar: body.avatar ?? null,
        role: body.role ?? "VIEWER",
      },
      update: {
        username: body.username,
        displayName: body.displayName,
        avatar: body.avatar ?? undefined,
      },
    });
    return successResponse({ user });
  });

  app.get("/me", { preHandler: authenticate }, async (req) => {
    const auth = getUser(req);
    const user = await app.prisma.user.findUnique({ where: { id: auth.sub } });
    const wallet = await app.prisma.wallet.findUnique({ where: { userId: auth.sub } });
    return successResponse({ user, wallet });
  });
}
