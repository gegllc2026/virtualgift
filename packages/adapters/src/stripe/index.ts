import Stripe from "stripe";
import type {
  CheckoutInput,
  CheckoutSession,
  PaymentProvider,
  WebhookEvent,
} from "@gateway/core";
import { AppError, ERROR_CODES } from "@gateway/shared";
import { metrics } from "@gateway/core";
import { assertMockAllowed } from "../guard.js";

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(secretKey: string, webhookSecret = "") {
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is required for StripePaymentProvider");
    }
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: input.userId,
        metadata: {
          userId: input.userId,
          coinPackageId: input.coinPackageId,
          coinAmount: String(input.coinAmount),
          ...(input.metadata ?? {}),
        },
        line_items: input.stripePriceId
          ? [{ price: input.stripePriceId, quantity: 1 }]
          : [
              {
                quantity: 1,
                price_data: {
                  currency: input.currency.toLowerCase(),
                  unit_amount: input.amount,
                  product_data: {
                    name: `${input.coinAmount} coins`,
                  },
                },
              },
            ],
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      provider: this.name,
      sessionId: session.id,
      url: session.url,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    };
  }

  async verifyWebhook(payload: Buffer, signature: string): Promise<WebhookEvent> {
    if (!this.webhookSecret) {
      throw new AppError(
        ERROR_CODES.PAYMENT_FAILED,
        "STRIPE_WEBHOOK_SECRET is not configured yet. Add it from Stripe Dashboard → Developers → Webhooks.",
        400,
      );
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch {
      metrics.inc("payment_failed_total");
      throw new AppError(ERROR_CODES.PAYMENT_FAILED, "Invalid Stripe webhook signature.", 400);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ?? session.client_reference_id;
      if (!userId) {
        throw new AppError(ERROR_CODES.PAYMENT_FAILED, "Webhook missing userId.", 400);
      }
      return {
        type: "checkout.session.completed",
        providerPaymentId: session.id,
        userId,
        coinPackageId: session.metadata?.coinPackageId,
        coinAmount: Number(session.metadata?.coinAmount ?? 0),
        amount: session.amount_total ?? 0,
        currency: (session.currency ?? "usd").toUpperCase(),
        rawType: event.type,
      };
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object as Stripe.PaymentIntent;
      return {
        type: "payment.failed",
        providerPaymentId: pi.id,
        userId: pi.metadata?.userId,
        amount: pi.amount,
        currency: pi.currency.toUpperCase(),
        rawType: event.type,
      };
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      return {
        type: "charge.refunded",
        providerPaymentId: typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.id,
        amount: charge.amount_refunded,
        currency: charge.currency.toUpperCase(),
        rawType: event.type,
      };
    }

    // Acknowledge unhandled types without failing the webhook endpoint.
    return {
      type: "payment.failed",
      providerPaymentId: event.id,
      rawType: event.type,
    };
  }

  async refundPayment(providerPaymentId: string, amount?: number): Promise<boolean> {
    const sessions = await this.stripe.checkout.sessions.retrieve(providerPaymentId).catch(() => null);
    const paymentIntent =
      sessions && typeof sessions.payment_intent === "string"
        ? sessions.payment_intent
        : providerPaymentId;

    await this.stripe.refunds.create({
      payment_intent: paymentIntent,
      ...(amount ? { amount } : {}),
    });
    return true;
  }
}

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock-stripe";
  private readonly sessions = new Map<string, CheckoutInput>();

  constructor() {
    assertMockAllowed(process.env.PROVIDERS_MODE ?? "mock", this.name);
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const sessionId = `mock_cs_${input.idempotencyKey}`;
    this.sessions.set(sessionId, input);
    return {
      provider: this.name,
      sessionId,
      url: `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id=${sessionId}`,
      paymentIntentId: `mock_pi_${input.idempotencyKey}`,
    };
  }

  async verifyWebhook(payload: Buffer, _signature: string): Promise<WebhookEvent> {
    const body = JSON.parse(payload.toString("utf8")) as {
      sessionId: string;
      userId: string;
      coinPackageId: string;
      coinAmount: number;
      amount: number;
      currency: string;
    };
    return {
      type: "checkout.session.completed",
      providerPaymentId: body.sessionId,
      userId: body.userId,
      coinPackageId: body.coinPackageId,
      coinAmount: body.coinAmount,
      amount: body.amount,
      currency: body.currency,
      rawType: "mock.checkout.completed",
    };
  }

  async refundPayment(): Promise<boolean> {
    return true;
  }

  /** Dev helper: simulate a successful payment for a session. */
  getSession(sessionId: string): CheckoutInput | undefined {
    return this.sessions.get(sessionId);
  }
}
