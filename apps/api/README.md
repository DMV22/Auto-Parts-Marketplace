# Auto Parts Marketplace API

NestJS 11 backend for Auto Parts Marketplace. It uses Prisma 7.9.0, PostgreSQL 16 and Better Auth 1.6.26. The implemented backend includes catalog/vehicle compatibility persistence, session authentication, RBAC, supplier ownership, customer garage and public fitment-aware catalog APIs. Commerce write workflows are not implemented yet.

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

# Auth, taxonomy, garage, catalog and PDP HTTP tests
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

Listing management, cart, checkout, order/payment processing and returns endpoints remain future milestones.
