import type { FastifyInstance } from "fastify";
import {
  checkoutSchema,
  successResponse,
  AppError,
  ERROR_CODES,
  WALLET_TX_TYPES,
} from "@gateway/shared";
import { creditCoins, beginIdempotent, metrics } from "@gateway/core";
import { authenticate, getUser } from "../auth.js";
import { asDb } from "../db.js";

export async function paymentRoutes(app: FastifyInstance) {
  app.get("/coin-packages", async () => {
    const packages = await app.prisma.coinPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return successResponse({ packages });
  });

  app.post("/checkout", { preHandler: authenticate }, async (req) => {
    const body = checkoutSchema.parse(req.body);
    const user = getUser(req);
    const coinPackage = await app.prisma.coinPackage.findUnique({
      where: { id: body.coinPackageId },
    });
    if (!coinPackage || !coinPackage.isActive) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "Coin package not found.", 404);
    }

    const { result } = await beginIdempotent(
      asDb(app.prisma),
      user.sub,
      body.idempotencyKey,
      body.coinPackageId,
      async () => {
        const session = await app.providers.payment.createCheckout({
          userId: user.sub,
          coinPackageId: coinPackage.id,
          coinAmount: coinPackage.coinAmount,
          amount: coinPackage.price,
          currency: coinPackage.currency,
          successUrl: body.successUrl,
          cancelUrl: body.cancelUrl,
          idempotencyKey: body.idempotencyKey,
          stripePriceId: coinPackage.stripePriceId,
        });

        const payment = await app.prisma.payment.create({
          data: {
            userId: user.sub,
            coinPackageId: coinPackage.id,
            provider: session.provider,
            providerPaymentId: session.sessionId,
            amount: coinPackage.price,
            currency: coinPackage.currency,
            coinAmount: coinPackage.coinAmount,
            status: "PENDING",
            metadata: { url: session.url },
          },
        });

        return { session, payment };
      },
    );

    return successResponse(result);
  });

  /**
   * Stripe webhook — raw body required for signature verification.
   * In mock mode, accept JSON to simulate completion.
   */
  app.post(
    "/webhook",
    {
      config: { rawBody: true },
    },
    async (req, reply) => {
      const signature =
        (req.headers["stripe-signature"] as string | undefined) ??
        (req.headers["x-gateway-mock-signature"] as string | undefined) ??
        "";

      const raw =
        (req as { rawBody?: Buffer }).rawBody ??
        Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));

      const event = await app.providers.payment.verifyWebhook(raw, signature);

      if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
        const existing = await app.prisma.payment.findFirst({
          where: {
            providerPaymentId: event.providerPaymentId,
            status: "SUCCEEDED",
          },
        });
        if (existing) {
          return reply.send(successResponse({ duplicate: true }));
        }

        const payment = await app.prisma.payment.findFirst({
          where: { providerPaymentId: event.providerPaymentId },
        });

        const userId = event.userId;
        const coinAmount = event.coinAmount || payment?.coinAmount || 0;
        if (!coinAmount) {
          throw new AppError(ERROR_CODES.PAYMENT_FAILED, "Missing coin amount on payment.");
        }

        await creditCoins(asDb(app.prisma), {
          userId,
          amount: coinAmount,
          type: WALLET_TX_TYPES.PURCHASE,
          reference: `purchase:${event.providerPaymentId}`,
          metadata: { providerPaymentId: event.providerPaymentId },
        });

        if (payment) {
          await app.prisma.payment.update({
            where: { id: payment.id },
            data: { status: "SUCCEEDED" },
          });
        } else {
          await app.prisma.payment.create({
            data: {
              userId,
              coinPackageId: event.coinPackageId,
              provider: app.providers.payment.name,
              providerPaymentId: event.providerPaymentId,
              amount: event.amount,
              currency: event.currency,
              coinAmount,
              status: "SUCCEEDED",
            },
          });
        }

        metrics.inc("payment_success_total");
        return reply.send(successResponse({ credited: true, coinAmount }));
      }

      if (event.type === "payment.failed") {
        metrics.inc("payment_failed_total");
        if (event.providerPaymentId) {
          await app.prisma.payment.updateMany({
            where: { providerPaymentId: event.providerPaymentId },
            data: { status: "FAILED" },
          });
        }
      }

      return reply.send(successResponse({ received: true, type: event.rawType }));
    },
  );

  /** Mock-only: complete a checkout without Stripe. */
  app.post("/mock/complete", { preHandler: authenticate }, async (req) => {
    if ((process.env.PROVIDERS_MODE ?? "mock") !== "mock") {
      throw new AppError(ERROR_CODES.FORBIDDEN, "Mock complete is disabled.", 403);
    }
    const body = req.body as {
      sessionId: string;
      coinPackageId: string;
      coinAmount: number;
      amount: number;
      currency: string;
    };
    const user = getUser(req);
    const payload = Buffer.from(
      JSON.stringify({
        sessionId: body.sessionId,
        userId: user.sub,
        coinPackageId: body.coinPackageId,
        coinAmount: body.coinAmount,
        amount: body.amount,
        currency: body.currency,
      }),
    );
    const event = await app.providers.payment.verifyWebhook(payload, "mock");
    if (event.type !== "checkout.session.completed") {
      throw new AppError(ERROR_CODES.PAYMENT_FAILED, "Unexpected mock event.");
    }

    await creditCoins(asDb(app.prisma), {
      userId: user.sub,
      amount: event.coinAmount,
      type: WALLET_TX_TYPES.PURCHASE,
      reference: `purchase:${event.providerPaymentId}`,
    });
    await app.prisma.payment.updateMany({
      where: { providerPaymentId: event.providerPaymentId },
      data: { status: "SUCCEEDED" },
    });
    metrics.inc("payment_success_total");
    return successResponse({ credited: true, coinAmount: event.coinAmount });
  });
}
