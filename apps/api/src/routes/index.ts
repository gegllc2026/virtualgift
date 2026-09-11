import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth.routes.js";
import { giftRoutes } from "./gifts.routes.js";
import { walletRoutes } from "./wallet.routes.js";
import { paymentRoutes } from "./payments.routes.js";
import { battleRoutes } from "./battles.routes.js";
import { livestreamRoutes } from "./livestream.routes.js";
import { leaderboardRoutes } from "./leaderboard.routes.js";
import { adminRoutes } from "./admin.routes.js";
import { localeRoutes } from "./locale.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(giftRoutes, { prefix: "/api/gifts" });
  await app.register(walletRoutes, { prefix: "/api/wallet" });
  await app.register(paymentRoutes, { prefix: "/api/payments" });
  await app.register(battleRoutes, { prefix: "/api/battles" });
  await app.register(livestreamRoutes, { prefix: "/api/livestreams" });
  await app.register(leaderboardRoutes, { prefix: "/api/leaderboards" });
  await app.register(localeRoutes, { prefix: "/api/locales" });
  await app.register(adminRoutes, { prefix: "/api/admin" });
}
