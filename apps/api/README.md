# Auto Parts Marketplace API

NestJS 11 backend for Auto Parts Marketplace. It uses Prisma 7.9.0, PostgreSQL 16 and Better Auth 1.6.26. The implemented backend includes catalog/vehicle compatibility, session authentication, RBAC, supplier ownership, customer garage, fitment-aware catalog APIs and the owner-isolated Cart → Checkout → Order/payment lifecycle.

Run commands from the repository root with Node.js `>=22.12.0 <23` and pnpm 9.

## Setup and migrations

Create `apps/api/.env` from `apps/api/.env.example`. Keep real credentials outside Git. Docker intentionally exposes PostgreSQL on host port `5433`; both URLs must use that port.

```bash
docker compose up -d postgres
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api start:dev
```

The Compose service provides:

- `auto_parts_dev` through `DATABASE_URL`;
- `auto_parts_test` through `TEST_DATABASE_URL`.

Use `pnpm --filter api prisma:migrate:dev -- --name <migration-name>` only when creating a reviewed forward migration. Never edit an applied migration. Prisma 7 requires explicit client generation and seed execution.

## Authentication environment

The safe example documents these environment-only values:

- `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`;
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Better Auth supports email/password and Google OAuth. Do not commit populated credentials.

## Commerce and Stripe environment

Commerce uses the server-only Stripe configuration documented in `.env.example`:

- `STRIPE_SECRET_KEY` — Stripe test-mode secret key used only by the API;
- `STRIPE_WEBHOOK_SECRET` — signing secret printed by the local Stripe listener;
- `STRIPE_CHECKOUT_SUCCESS_URL` and `STRIPE_CHECKOUT_CANCEL_URL` — browser redirects that never mutate payment or Order status.

For a local Stripe test-mode checkout:

1. Start PostgreSQL and the API, then run `stripe login` once for the Stripe CLI.
2. Run `stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe`.
3. Put the listener's `whsec_...` value in the untracked `apps/api/.env` as `STRIPE_WEBHOOK_SECRET`, then restart the API. Never copy it into Git or logs.
4. Create a Cart and call the server checkout endpoint with a fresh UUID `Idempotency-Key`.
5. Open the returned Stripe Checkout URL and complete payment with Stripe test-mode data. The signed webhook, not the success redirect, moves the pending Order to `PAID`.

Generic `stripe trigger` fixtures do not carry this application's Order/session/amount metadata. A mismatched signed event intentionally receives a retryable error and performs no database mutation.

## Demo seed

```bash
pnpm --filter api prisma:seed
```

The seed accepts only local `auto_parts_dev`, is safe to run repeatedly and creates synthetic catalog, taxonomy, supplier, user and commerce scenarios. It does not create login credentials, password Accounts, Sessions or Verification records. Tests do not use this seed.

## Tests

```bash
# Unit tests, including validation, URL guards and fitment truth table
pnpm --filter api test

# PostgreSQL persistence and application-service integration tests
pnpm --filter api test:int

# Auth, taxonomy, garage, catalog, PDP, commerce and Supplier Cabinet HTTP tests
pnpm --filter api test:e2e
```

Integration and e2e tests accept only a local `TEST_DATABASE_URL` targeting `auto_parts_test`. Shared setup applies committed migrations; suites create and clean their own fixtures.

## Repository checks

```bash
pnpm lint
pnpm check-types
pnpm build
git diff --check
```

## Current API boundary

Better Auth remains available under `/api/auth/*`. Product APIs use `/api/v1`:

- public vehicle selector: `GET /api/v1/vehicles/years|makes|models|generations|engines`;
- Customer-only garage: `GET|POST /api/v1/garage/vehicles`, `PUT /api/v1/garage/vehicles/:id/active`, `DELETE /api/v1/garage/vehicles/:id`;
- public catalog: `GET /api/v1/catalog/products`;
- public PDP: `GET /api/v1/catalog/products/:productId`.

Catalog query parameters are allowlisted: `q`, category/brand IDs, price range with required `currency`, `inStock`, `condition`, vehicle context, pagination and sorting. Pagination defaults to 20 and is capped at 50. Supported sorts are `newest`, `name_asc`, `name_desc`, `price_asc` and `price_desc`.

Catalog and PDP accept either explicit `year` + `generationId` + optional `engineTypeId`, or an owner-only `savedVehicleId`. PDP fitment results are `compatible`, `incompatible`, `unknown` or `caution`. Stable reason codes are `VEHICLE_NOT_SELECTED`, `EXACT_ENGINE_MATCH`, `EXACT_ENGINE_EXCLUSION`, `GENERATION_MATCH`, `GENERATION_EXCLUSION`, `ENGINE_REQUIRED` and `NO_FITMENT_DATA`.

Public listings expose derived `inStock`, not exact stock quantity, and only public Supplier fields `{ id, name, slug }`. Invalid query/hierarchy returns `400`; missing or unavailable public resources return `404`; unauthenticated `savedVehicleId` access returns `401`, while missing and cross-owner saved vehicles share the same `404` response.

## Commerce API boundary

Cart and Order ownership is resolved server-side. A valid Customer session takes precedence; otherwise the API issues the opaque `apm_guest_cart` cookie with `HttpOnly`, `SameSite=Lax`, `Path=/` and production `Secure`. PostgreSQL stores only its SHA-256 hash. Losing or expiring that cookie loses access to the corresponding guest Cart and Orders; raw Order IDs are not access credentials.

Implemented routes:

- `GET /api/v1/cart`;
- `POST /api/v1/cart/items`;
- `PATCH /api/v1/cart/items/:itemId`;
- `DELETE /api/v1/cart/items/:itemId` and `DELETE /api/v1/cart`;
- `POST /api/v1/checkout/session` with a required fresh UUID `Idempotency-Key` and an empty body;
- public signed boundary `POST /api/v1/webhooks/stripe`;
- `GET /api/v1/orders`;
- `GET /api/v1/orders/:orderId`;
- `GET /api/v1/orders/:orderId/timeline`.

The server re-reads `ACTIVE` Listing price, currency and stock during checkout. It reserves stock and creates a `PENDING_PAYMENT` Order with immutable OrderItem snapshots before calling Stripe. Client-supplied price, total, owner or status fields are rejected. Repeating the same owner/key safely converges on the same checkout; conflicting reuse returns `409`.

Only a signature-verified, metadata/session/currency/amount-consistent paid webhook may set `PAID`. Duplicate Stripe event IDs acknowledge without repeated transitions; failed or expired pending checkout releases stock once. Missing signature returns `400`; stale Cart/stock/currency or idempotency conflicts return `409`; provider/consistency failures return retryable `503`. Cross-owner and missing Cart items/Orders use non-disclosing responses.

Order history and timeline use opaque cursor pagination (`limit` default 20, maximum 50). Order detail returns historical item snapshots, not current Listing price or stock. PaymentEvent payloads, guest hashes, Stripe identifiers and internal ownership fields are never part of public Order responses.

## Supplier Cabinet API boundary

Supplier routes require an authenticated `SUPPLIER_USER` with an active membership matching `:supplierId`. `ADMIN` has an explicit bypass; `SUPPORT_MANAGER` does not receive supplier access. Guards enforce the route boundary and every persistence query repeats the supplier predicate. Missing and foreign-owned detail resources return the same non-disclosing `404`.

Implemented routes:

- `GET|POST /api/v1/suppliers/:supplierId/listings`;
- `GET|PATCH /api/v1/suppliers/:supplierId/listings/:listingId`;
- `POST /api/v1/suppliers/:supplierId/listings/:listingId/submit|pause|resume|archive`;
- `PUT /api/v1/suppliers/:supplierId/listings/:listingId/stock`;
- `GET /api/v1/admin/moderation/listings`;
- `POST /api/v1/admin/moderation/listings/:listingId/approve|reject|pause`;
- `POST /api/v1/admin/listings/:listingId/approve|reject` (compatibility aliases);
- `GET /api/v1/suppliers/:supplierId/order-items`;
- `GET /api/v1/suppliers/:supplierId/order-items/:orderItemId`.

Listings follow the explicit `DRAFT → PENDING_APPROVAL → ACTIVE | REJECTED` publication flow, with `ACTIVE ↔ PAUSED` and terminal `ARCHIVED` actions. Only `ACTIVE` Listings are public or purchasable. Material ProductVariant/condition/currency edits require renewed approval; price and stock edits preserve publication status.

Stock updates accept absolute `{ quantity, expectedVersion }`. Successful supplier updates and checkout reservation/release atomically increment `inventoryVersion`; stale writes return `409` and PostgreSQL prevents negative stock.

Supplier OrderItem reads expose only immutable item snapshots, quantity/money and minimal public Order status/timestamps. They exclude full Orders, customer/guest identity, addresses, payment/webhook payloads, Stripe fields and other Suppliers' items. Collections use allowlisted filters, a maximum page size of 50 and opaque deterministic cursors.

## Internal Ops API boundary

`SUPPORT_MANAGER` and `ADMIN` can use `/api/v1/internal/orders*`, `/api/v1/internal/returns*`, internal Order/Return Notes and `/api/v1/internal/activity`. Customer Return routes remain owner-scoped under `/api/v1/orders/:orderId/items/:orderItemId/returns*`. Payment status is never changed by Internal Ops; the verified Stripe webhook remains authoritative.

Only `ADMIN` can use `/api/v1/admin/moderation/listings*`. Reject and emergency pause require `{ "reason": "..." }`; the reason is visible in the Supplier Listing projection, while ActivityLog remains internal-only. Supplier cannot resume an emergency-paused Listing. Queue/filter queries are allowlisted, bounded to 50 records and use opaque deterministic cursors.

Internal Notes and ActivityLog never appear in Customer, Supplier, Catalog or commerce DTOs. Tests use suite-owned fixtures in guarded `auto_parts_test` and do not require demo seed or live Stripe.

Fulfillment, shipping, payouts and refunds remain future milestones.
