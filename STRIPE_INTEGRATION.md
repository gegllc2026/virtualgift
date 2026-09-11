# Stripe Integration

## Architecture

```
Host UI → POST /api/payments/checkout → PaymentProvider.createCheckout()
                                              ↓
                                         Stripe Checkout
                                              ↓
Stripe → POST /api/payments/webhook → verify signature → credit wallet
```

Core wallet code never imports the Stripe SDK. Only `StripePaymentProvider` does.

## Configuration

```
PROVIDERS_MODE=live
STRIPE_SECRET_KEY=sk_live_or_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...   # frontend only, if using Elements later
```

## Coin packages

Admin configures packages with:

- `coinAmount` (integer coins)
- `price` (integer **minor units**, e.g. $4.99 → `499`)
- `currency` (ISO 4217, e.g. `USD`)
- optional `stripePriceId` (use Stripe Price objects when set)

## Webhook

- Endpoint: `POST /api/payments/webhook`
- Verify with Stripe signature header (`stripe-signature`)
- On `checkout.session.completed`, credit coins using idempotent reference `purchase:{sessionId}`
- Never trust the frontend to confirm payment

## Mock mode

With `PROVIDERS_MODE=mock`:

- Checkout returns a mock URL/session id
- `POST /api/payments/mock/complete` credits the wallet for local demos
- Mock complete is **rejected** when not in mock mode

## Refunds

`PaymentProvider.refundPayment(providerPaymentId, amount?)` — implement operational refunds via admin tooling; pair with `REFUND` wallet transactions as needed.
