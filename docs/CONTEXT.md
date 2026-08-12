# CONTEXT.md

## Product

Auto Parts Marketplace is an early-stage marketplace for automotive parts. The repository currently provides a reproducible backend foundation and public fitment-aware discovery API; frontend-to-API integration and commerce write workflows remain future work.

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
apps/api/src/garage/    Customer-owned SavedVehicle API
apps/api/src/prisma/    Single Nest Prisma provider and database guards
apps/api/src/vehicle-taxonomy/  Public vehicle selector API
apps/api/test/          Integration/e2e suites and guarded test setup

packages/ui/            Shared React UI primitives
docker/postgres/init/   Local test-database initialization
docker-compose.yml      PostgreSQL 16 development/test service
```

## Implemented backend foundation

The canonical Prisma model contains:

- catalog: `Category`, `Brand`, `Product`, `ProductVariant`;
- vehicle taxonomy: `VehicleMake`, `VehicleModel`, `VehicleGeneration`, `EngineType`, `FitmentRule`;
- identity and suppliers: `User`, `Session`, `Account`, `Verification`, `CustomerProfile`, `SavedVehicle`, `Address`, `Supplier`, `SupplierUser`;
- commerce persistence baseline: `Listing`, `Order`, `OrderItem`, `PaymentEvent`, `ReturnRequest`.

Persisted roles are `CUSTOMER`, `SUPPLIER_USER`, `SUPPORT_MANAGER` and `ADMIN`; Guest is an unauthenticated state, not a database role. RBAC answers which action a role may perform, while supplier ownership requires an active membership matching the target Supplier.

Commerce records have agreed status enums, defaults, foreign keys and idempotency constraints. They are persistence contracts only: status-transition services, checkout, Stripe/webhook processing, stock reservation, shipping and returns workflows are not implemented.

## Implemented discovery API

- `/api/v1/vehicles/*` provides the deterministic Year → Make → Model → Generation → Engine selector.
- `/api/v1/garage/vehicles` provides Customer-only SavedVehicle CRUD and active selection with owner checks.
- `GET /api/v1/catalog/products` provides public PostgreSQL-backed search, filters, bounded pagination and stable sorting over `ACTIVE` Listings.
- `GET /api/v1/catalog/products/:productId` provides Product/Variant details, public Supplier listing data and fitment answers.

Catalog and PDP normalize explicit taxonomy context or an owner-only `savedVehicleId` through one vehicle-context boundary. One `FitmentService` applies exact-engine precedence over generation-wide rules and returns `compatible`, `incompatible`, `unknown` or `caution`; missing coverage never implies compatibility.

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
```

Integration and e2e suites require local `TEST_DATABASE_URL` targeting only `auto_parts_test`. Shared setup validates the target and applies committed migrations. Each suite owns and cleans its fixtures; tests do not import or depend on demo seed.

`prisma:seed` is guarded separately and accepts only local `auto_parts_dev`. It is idempotent and contains synthetic data only.

Update this document whenever the stack, persistence model or implemented product boundaries change.
