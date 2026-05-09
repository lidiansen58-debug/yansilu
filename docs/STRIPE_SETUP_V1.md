# Stripe Setup V1

## Goal

Enable the marketing-site upgrade flow to switch from local mock billing to real Stripe Checkout without rewriting the frontend flow.

## Current Behavior

The app now supports two billing modes:

- `mock`
- `stripe`

Mode selection is automatic on the API server:

- if Stripe env vars are missing, billing stays in `mock`
- if Stripe env vars are present, checkout uses real Stripe Checkout Sessions

## Required Environment Variables

Set these before starting the API server:

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
APP_BASE_URL=http://localhost:5173
```

Optional:

```env
API_PORT=3000
WEB_PORT=5173
```

## Frontend Behavior

The pricing page still calls the same endpoint:

`POST /api/v1/billing/checkout-session`

The response now returns:

- `mode: "mock_checkout"` for local mock
- `mode: "stripe"` for real Stripe

The frontend follows `checkoutUrl` in either case.

## Webhook Endpoint

The API now exposes:

`POST /api/v1/billing/webhook/stripe`

Behavior:

- if `STRIPE_WEBHOOK_SECRET` is set, the endpoint verifies the Stripe signature
- if it is not set, the endpoint accepts raw JSON payloads for local testing only

Handled event types:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Current Limitation

The app still stores billing state in memory only.

That means:

- mock mode is fully self-contained
- Stripe mode can create a real hosted Checkout Session
- webhook events can now update in-memory billing state
- but server restarts will lose session-linked billing state

## Next Step

To complete Stripe properly, add:

1. persisted billing storage instead of in-memory session-only state
2. account lookup beyond active local sessions
3. Stripe customer portal entry and invoice history
