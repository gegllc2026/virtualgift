export type CheckoutInput = {
  userId: string;
  coinPackageId: string;
  coinAmount: number;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
  stripePriceId?: string | null;
  metadata?: Record<string, string>;
};

export type CheckoutSession = {
  provider: string;
  sessionId: string;
  url: string | null;
  paymentIntentId?: string | null;
};

export type WebhookEvent =
  | {
      type: "checkout.session.completed" | "payment_intent.succeeded";
      providerPaymentId: string;
      userId: string;
      coinPackageId?: string;
      coinAmount: number;
      amount: number;
      currency: string;
      rawType: string;
    }
  | {
      type: "payment.failed" | "charge.refunded";
      providerPaymentId: string;
      userId?: string;
      amount?: number;
      currency?: string;
      rawType: string;
    };

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(payload: Buffer, signature: string): Promise<WebhookEvent>;
  refundPayment(providerPaymentId: string, amount?: number): Promise<boolean>;
}
