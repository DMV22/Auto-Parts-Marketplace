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

The committed migration chain implements catalog and vehicle taxonomy, identity/supplier ownership, and status-bearing commerce records. Integration tests cover migration preservation, catalog/fitment constraints, auth/session lifecycle, RBAC, supplier ownership, status defaults, foreign keys and payment-event idempotency.

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

- public catalog/PDP/fitment REST API;
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
  -> future versioned NestJS API
  -> Auth guards / application services
  -> PrismaModule / PrismaService
  -> PostgreSQL 16
```
