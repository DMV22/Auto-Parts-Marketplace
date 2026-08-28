# CONTEXT.md

## Product

Auto Parts Marketplace is an early-stage marketplace for automotive parts. The repository currently provides a reproducible backend foundation and an integrated Next.js experience for public discovery, Customer/Guest commerce, Supplier Cabinet and Internal CRM/OMS workflows. Supplier fulfillment and production deployment remain future work.

## Current repository baseline

- package manager: pnpm 9;
- workspace orchestration: Turborepo 2;
- Node.js engine: `>=22.12.0 <23`;
- frontend: Next.js 16 and React 19;
- backend: NestJS 11;
- ORM: Prisma `7.9.0` with `@prisma/adapter-pg`;
- database: PostgreSQL 16 through Docker Compose;
- authentication: Better Auth `1.6.26`, session-based email/password and Google OAuth;
- backend tests: Jest, PostgreSQL integration tests and Supertest e2e tests;
- CI/CD and production deployment: not implemented.

Docker maps PostgreSQL container port `5432` to host port `5433` to avoid conflicts with machine-local PostgreSQL installations. Development and tests use separate databases: `auto_parts_dev` and `auto_parts_test`. Connection-string formats are documented in `apps/api/.env.example`; real credentials remain outside Git.

## Repository map

```text
apps/
  web/                  Next.js application
  api/                  NestJS API and Prisma persistence owner

apps/api/prisma/        Schema, committed migrations and demo seed
apps/api/src/auth/      Better Auth, session, RBAC and ownership boundary
apps/api/src/catalog/   Public catalog/PDP queries and shared fitment policy
apps/api/src/commerce/  Cart, Checkout, Payments and owner-only Orders boundaries
apps/api/src/garage/    Customer-owned SavedVehicle API
apps/api/src/internal-ops/  Internal OMS, Returns, Notes and ActivityLog APIs
apps/api/src/prisma/    Single Nest Prisma provider and database guards
apps/api/src/supplier-cabinet/  Supplier-owned Listing, inventory and OrderItem APIs
apps/api/src/vehicle-taxonomy/  Public vehicle selector API
apps/api/test/          Integration/e2e suites and guarded test setup

apps/web/app/           App Router routes for public, commerce, supplier and internal workspaces
apps/web/components/    Accessible feature UI and shared primitives
apps/web/lib/           Typed API, query, auth and domain projections
apps/web/test/          Vitest/MSW component tests and guarded Playwright smoke

packages/ui/            Shared React UI primitives
docker/postgres/init/   Local test-database initialization
docker-compose.yml      PostgreSQL 16 development/test service
```

## Implemented backend foundation

The canonical Prisma model contains:

- catalog: `Category`, `Brand`, `Product`, `ProductVariant`;
- vehicle taxonomy: `VehicleMake`, `VehicleModel`, `VehicleGeneration`, `EngineType`, `FitmentRule`;
- identity and suppliers: `User`, `Session`, `Account`, `Verification`, `CustomerProfile`, `SavedVehicle`, `Address`, `Supplier`, `SupplierUser`;
- commerce/internal operations: `Listing`, `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatusEvent`, `PaymentEvent`, `ReturnRequest`, `Note`, `ActivityLog`.

Persisted roles are `CUSTOMER`, `SUPPLIER_USER`, `SUPPORT_MANAGER` and `ADMIN`; Guest is an unauthenticated state, not a database role. RBAC answers which action a role may perform, while supplier ownership requires an active membership matching the target Supplier.

Commerce records have agreed status enums, defaults, foreign keys and idempotency constraints. Cart ownership, server-authoritative checkout, stock reservation, pending Orders, signed Stripe webhook transitions and owner-only Order reads are implemented. Supplier Cabinet adds supplier-scoped Listing CRUD, publication actions, optimistic stock concurrency and privacy-safe OrderItem reads. Internal Ops adds OMS Order transitions, Customer/Support returns, internal Notes/ActivityLog and audited Admin Listing moderation. Supplier fulfillment, shipping, payouts and refunds are not implemented.

## Implemented discovery API

- `/api/v1/vehicles/*` provides the deterministic Year → Make → Model → Generation → Engine selector.
- `/api/v1/garage/vehicles` provides Customer-only SavedVehicle CRUD and active selection with owner checks.
- `GET /api/v1/catalog/products` provides public PostgreSQL-backed search, filters, bounded pagination and stable sorting over `ACTIVE` Listings.
- `GET /api/v1/catalog/products/:productId` provides Product/Variant details, public Supplier listing data and fitment answers.

Catalog and PDP normalize explicit taxonomy context or an owner-only `savedVehicleId` through one vehicle-context boundary. One `FitmentService` applies exact-engine precedence over generation-wide rules and returns `compatible`, `incompatible`, `unknown` or `caution`; missing coverage never implies compatibility.

## Implemented commerce API

- `/api/v1/cart*` provides owner-isolated Customer/guest Cart reads and writes with live Listing validation.
- `POST /api/v1/checkout/session` requires a UUID `Idempotency-Key`, reserves stock and persists a pending Order plus immutable OrderItem snapshots before the server creates a Stripe Checkout Session.
- `POST /api/v1/webhooks/stripe` verifies the exact raw-body signature and atomically/idempotently records PaymentEvent, Order transition, timeline and reservation release.
- `/api/v1/orders*` provides owner-only history, immutable detail and a public reason-coded timeline with bounded opaque-cursor pagination.

Guest is not a role. The API issues an opaque HttpOnly cookie and stores only its SHA-256 hash for Cart/Order ownership. Customer sessions take precedence. Cross-owner and missing Orders share the same non-disclosing response. Redirects and read endpoints cannot mutate payment state; only a verified consistent webhook can set `PAID`.

## Implemented Supplier Cabinet API

- `/api/v1/suppliers/:supplierId/listings*` provides active-membership-scoped Listing CRUD, publication actions and absolute stock updates with `inventoryVersion` optimistic concurrency.
- `/api/v1/admin/moderation/listings*` is the Admin-only global moderation boundary for queue, approve, reject and emergency pause; legacy approve/reject aliases remain supported. SupportManager has no implicit access.
- `/api/v1/suppliers/:supplierId/order-items*` provides read-only supplier projections of owned OrderItems without full Order, identity, address, payment, Stripe or other-Supplier data.

Supplier routes combine session, role and ownership guards with supplier predicates in every Prisma query. Only `ACTIVE` Listings enter Catalog/PDP/Cart. Stale stock updates return `409`; checkout reservation and compensation increment the same inventory version, while PostgreSQL enforces non-negative stock. Supplier collections use allowlisted filters, bounded cursor pagination and deterministic sorting.

## Implemented Internal Ops API

- `/api/v1/internal/orders*` provides SupportManager/Admin OMS reads, timeline and controlled non-payment transitions.
- Customer-owned `/api/v1/orders/:orderId/items/:orderItemId/returns*` and SupportManager/Admin `/api/v1/internal/returns*` implement the centralized ReturnRequest lifecycle.
- `/api/v1/internal/.../notes` and `/api/v1/internal/activity` expose internal-only append/redaction and audit projections; Customer and Supplier responses never include these records.
- `/api/v1/admin/moderation/listings*` provides the audited Admin-only Listing queue and moderation transitions. Reject/emergency pause require a supplier-visible reason, and an emergency-paused Listing cannot be resumed by Supplier.

Order, Return, Note/redaction and Listing moderation mutations append ActivityLog records in the same transaction as the state change. Payment status remains exclusively owned by the signature-verified Stripe webhook.

## Implemented frontend

- F0–F2 provide the same-origin API boundary, HttpOnly session handling, public shell/auth, vehicle taxonomy selector and Customer Garage.
- F3–F5 provide URL-owned Catalog filters, PDP/fitment presentation, owner-isolated Cart/Checkout recovery, Orders/timeline and Customer Returns.
- F6–F7 provide role-aware Supplier Cabinet and Internal Ops workspaces while leaving authorization, ownership and transitions authoritative in NestJS.

TanStack Query owns server state; local React state is limited to drafts and transient UI. Successful sign-out and identity-changing sign-in clear all cached query data before the next session is used. Browser storage does not hold session, guest, owner, order or payment tokens. The Next.js server rewrites relative `/api/*` requests to `API_INTERNAL_URL`, keeping browser cookies same-origin.

## Auth and persistence boundaries

`AppModule` imports one global `PrismaModule` and one `AuthModule`. `PrismaService` is the only Nest application-wide Prisma provider and uses the PostgreSQL driver adapter. Better Auth uses that persistence boundary through its Prisma adapter and exposes email/password plus Google OAuth session flows.

Secrets and OAuth credentials are environment-only. Demo seed users are domain records without password Accounts, Sessions or Verification records.

## Local workflow

Create `apps/api/.env` from the safe example and keep host port `5433` in both database URLs. From the repository root:

```bash
docker compose up -d postgres
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api prisma:seed
pnpm --filter api start:dev
```

Use `prisma:migrate:dev` only to create a new reviewed forward migration. Applied migration files are immutable. Prisma 7 migrations do not generate the client or run seed automatically.

## Tests and verification

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
pnpm --filter web test
pnpm --filter web test:e2e
```

Integration and e2e suites require local `TEST_DATABASE_URL` targeting only `auto_parts_test`. Shared setup validates the target and applies committed migrations. Each suite owns and cleans its fixtures; tests do not import or depend on demo seed. The current Playwright suite validates the platform shell, same-origin cookie transport and email/Google-auth initiation; complete browser journeys for Garage, Catalog, commerce, Supplier and Internal Ops remain a documented readiness follow-up.

`prisma:seed` is guarded separately and accepts only local `auto_parts_dev`. It is idempotent and contains synthetic data only.

Update this document whenever the stack, persistence model or implemented product boundaries change.
