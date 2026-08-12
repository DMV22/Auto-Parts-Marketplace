# ARCHITECTURE.md

## Purpose

Auto Parts Marketplace is intended to let customers discover compatible automotive parts and suppliers manage marketplace inventory through a web application backed by a NestJS API and PostgreSQL.

The repository currently implements the backend foundation, not complete marketplace workflows. Do not invent checkout, payment, shipping, moderation or return behavior without an accepted milestone.

## Current system

- `apps/web` — Next.js 16 / React 19 application; no marketplace API integration yet.
- `apps/api` — NestJS 11 API, Better Auth boundary and Prisma 7.9.0 persistence owner.
- `packages/ui` — shared presentational React primitives.
- Docker Compose — PostgreSQL 16 with `auto_parts_dev` and `auto_parts_test`, exposed on host port `5433`.
- pnpm/Turborepo — workspace task graph, including `.next/**` and API `dist/**` build outputs.

The committed migration chain implements catalog and vehicle taxonomy, identity/supplier ownership, and status-bearing commerce records. The API implements public taxonomy, catalog and PDP reads plus Customer-owned garage operations. Regression coverage includes migration preservation, fitment semantics, catalog filtering/pagination, auth/session lifecycle, RBAC and ownership.

## Application boundaries

- `apps/web` owns browser UI and routing. It never imports Prisma Client or connects to PostgreSQL.
- `apps/api` owns HTTP, authentication, authorization, domain services, Prisma schema/migrations and persistence orchestration.
- Controllers delegate to application/domain services; they do not construct Prisma clients.
- Shared packages must not depend on application code or own persistence concerns.

## Persistence boundary

`AppModule` imports the global `PrismaModule`, which exports one application-wide `PrismaService`. The service constructs Prisma Client with `PrismaPg`, connects during Nest module initialization and disconnects during module destruction. Future domain repositories and services receive it through dependency injection.

Normal development reads `DATABASE_URL`. Under `NODE_ENV=test`, the provider requires `TEST_DATABASE_URL` and accepts only local `auto_parts_test`. Integration/e2e setup applies committed migrations before suites and never runs demo seed.

The standalone Prisma CLI seed process is the only additional Prisma Client boundary. It is not part of Nest runtime, is guarded to local `auto_parts_dev`, and creates synthetic idempotent demo records.

## Authentication and authorization boundary

`AuthModule` is the single Better Auth integration boundary and reuses the Prisma persistence owner. Supported authentication methods are email/password and Google OAuth. Sessions are persisted; secrets and provider credentials come only from environment variables.

Authorization has two independent layers:

- RBAC guards/decorators enforce `CUSTOMER`, `SUPPLIER_USER`, `SUPPORT_MANAGER` and `ADMIN` permissions;
- supplier ownership verifies an active `SupplierUser` membership for the target Supplier.

Guest is represented by the absence of an authenticated session and is never persisted as a role.

## Catalog read boundary

`VehicleTaxonomyModule` exposes the public selector under `/api/v1/vehicles/*`. `GarageModule` owns authenticated SavedVehicle operations under `/api/v1/garage/vehicles`. `CatalogModule` exposes public catalog list and PDP routes under `/api/v1/catalog/products`.

Catalog controllers perform whitelist validation and delegate to injected services. Explicit taxonomy fields and owner-only `savedVehicleId` are normalized by one vehicle-context service. `FitmentService` is the shared policy for catalog compatibility filtering and PDP answers; exact-engine rules override generation-wide rules, while missing or incomplete coverage returns `unknown` or `caution` instead of a false compatibility claim.

Public queries return only `ACTIVE` Listings and explicit projections. PDP exposes derived availability and `{ id, name, slug }` Supplier data without exact inventory, memberships or auth records. Database filtering, pagination and sorting remain in PostgreSQL; nested relation access is bounded and contains no per-variant Prisma calls.

## Domain persistence

```text
Catalog                          Vehicle compatibility
Category / Brand                VehicleMake
        |                             |
     Product                     VehicleModel
        |                             |
 ProductVariant  <--- FitmentRule ---> VehicleGeneration
                                           |
                                       EngineType

Supplier -> Listing -> OrderItem -> Order -> User
                         |
                   ReturnRequest
Order -> PaymentEvent (unique externalEventId)
```

`Listing`, `Order`, `PaymentEvent` and `ReturnRequest` status enums are stored and constrained, but transitions are not executed automatically. Payment events are append-only external-event records.

## Not implemented

- supplier listing-management endpoints;
- cart, checkout, Stripe webhook processing or stock reservation;
- order fulfillment, shipping and return workflows;
- frontend-to-API integration;
- production database, secret management, backups, monitoring and deployment architecture.

These capabilities belong to later milestones and must build on the established persistence, auth and ownership boundaries.

## Runtime context

```text
Browser
  -> Next.js application
  -> versioned NestJS API (`/api/v1`) or Better Auth (`/api/auth`)
  -> optional auth guards / application services
  -> PrismaModule / PrismaService
  -> PostgreSQL 16
```
