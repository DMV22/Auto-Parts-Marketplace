# Stripe Webhook Public-Demo Runbook

## Scope

This runbook covers Stripe Checkout and webhook validation for the public
portfolio/demo environment. Stripe must remain in test mode. The procedure does
not authorize live payments, real customer or payment data, manual Order status
edits, or direct writes to Neon.

## Hosted boundary

- Browser-facing origin:
  `https://auto-parts-marketplace-web-bqbz.vercel.app`
- Render webhook endpoint:
  `https://auto-parts-marketplace-api.onrender.com/api/v1/webhooks/stripe`
- Checkout success URL:
  `https://auto-parts-marketplace-web-bqbz.vercel.app/checkout/success`
- Checkout cancel URL:
  `https://auto-parts-marketplace-web-bqbz.vercel.app/checkout/cancel`
- `STRIPE_SECRET_KEY` must be a test-mode key and exists only in Render
  environment settings.
- `STRIPE_WEBHOOK_SECRET` is the endpoint-specific hosted destination secret
  and exists only in Render environment settings. It is not the temporary
  secret printed by a local Stripe CLI listener.

Never copy either secret, a Stripe signature, webhook body, Checkout Session
ID, Order ID, email, cookie or payment details into Git, screenshots, logs or
validation reports.

## Subscribed events

The hosted Stripe test-mode destination must subscribe only to the events the
application currently supports:

- `checkout.session.completed`;
- `checkout.session.async_payment_succeeded`;
- `checkout.session.async_payment_failed`;
- `checkout.session.expired`.

Adding event types does not add application behavior. Any expanded payment,
refund or dispute workflow requires a separately reviewed milestone.

## Payment authority and diagnostics

Checkout creates an Order as `PENDING_PAYMENT` and reserves stock before the
provider redirect. Returning to either Vercel redirect is read-only and cannot
mark the Order paid. Only an exact-raw-body, signature-verified event whose
Order metadata, Checkout Session, currency and amount match may perform a
payment transition.

Render diagnostics intentionally contain only:

- an application-generated request ID;
- a verified Stripe event ID and event type;
- the processing outcome (`processed`, `duplicate`, `ignored`, `rejected` or
  `retryable_failure`);
- a safe reason code for rejected/retryable requests;
- processing duration.

Invalid signatures are logged without the header value or body. Processing
errors are logged without exception details or Checkout Session/Order
identifiers.

## Manual hosted validation

Run this checklist only after a separately approved synthetic demo-data
bootstrap has populated Neon with a purchasable test Listing. Use Stripe test
payment data only. Record pass/fail, HTTP status and a nonsensitive UTC
timestamp; do not record identifiers or payloads.

1. Open the canonical Vercel site and create a Cart containing synthetic data.
2. Start Checkout and confirm the Order is `PENDING_PAYMENT` before a verified
   webhook is processed.
3. Complete Stripe test Checkout and confirm the hosted webhook delivery is
   `2xx` in Stripe Dashboard.
4. Refresh the read-only confirmation page and confirm the Order becomes
   `PAID` exactly once.
5. Resend the same event from Stripe Dashboard and confirm the delivery remains
   `2xx`, with a `duplicate` diagnostic and no repeated Order/stock effect.
6. Validate an expired test Checkout and an asynchronous failed-payment event;
   each must cancel a still-pending Order and release its reservation once.
7. Send an invalid-signature request without any real secret and confirm `400`
   with no persistence change.
8. Validate a signed but inconsistent synthetic event and confirm a retryable
   non-`2xx` response with no persistence change.

| Check                                    | Result  | Evidence policy                  |
| ---------------------------------------- | ------- | -------------------------------- |
| Stripe account and API key are test mode | Pass    | Mode/key prefix only             |
| Exact Render destination configured      | Pass    | Public endpoint only             |
| Four supported events subscribed         | Pass    | Event names only                 |
| Endpoint secret stored only on Render    | Pass    | Variable name, never value       |
| Success/cancel redirects use Vercel      | Pass    | Public URLs only                 |
| Pending before verified webhook          | Pending | Result/status/timestamp only     |
| Paid exactly once after verified webhook | Pending | Result/status/timestamp only     |
| Duplicate resend is idempotent           | Pending | HTTP result and safe log outcome |
| Expired/failed release stock once        | Pending | Result/status/timestamp only     |
| Invalid signature returns `400`          | Pending | HTTP status only                 |
| Consistency failure remains retryable    | Pending | HTTP status only                 |

The pending rows are blocked by the intentionally empty Neon catalog. Do not
work around this by pointing the local seed at Neon or by inserting ad hoc data.

## Delayed delivery and cold-start recovery

Checkout normally warms the Render Free API shortly before Stripe sends its
event. If Render is still unavailable or returns a retryable response:

1. Confirm `/api/v1/health/ready` has recovered without exposing environment
   values.
2. Inspect Render logs using the request/event correlation fields only.
3. In Stripe Dashboard test mode, open the failed delivery and use **Resend**.
4. Confirm the delivery is `2xx`; duplicate delivery is safe and expected.
5. Refresh the Vercel Order view. Never update payment state from the redirect,
   browser console, Render shell or Neon console.

## Failure and rollback

If webhook processing regresses, stop creating new test Checkouts, preserve the
failed Stripe delivery for later resend, and roll Render back to its last
known-good revision. Correct configuration or availability, verify readiness,
then resend the test event from Stripe Dashboard. Do not weaken signature or
consistency checks and do not rotate or reveal secrets as a debugging shortcut.
