# ARCHITECTURE.md

## Purpose

Auto Parts Marketplace is intended to let customers discover compatible automotive parts and suppliers manage marketplace inventory through a web application backed by a NestJS API and PostgreSQL.

The repository currently implements the backend foundation, the F0–F7 web experience for discovery, owner-isolated commerce, Supplier Cabinet and Internal Ops, and UI redesign slices U0–U5. U6/F8 remain `Conditional` pending external/manual evidence. It does not implement supplier fulfillment, shipping, refunds or external operational integrations; do not invent those workflows without an accepted milestone.

## Current system

- `apps/web` — Next.js 16 / React 19 App Router application for public, Customer/Guest, Supplier and Internal Ops workflows.
- `apps/api` — NestJS 11 API, Better Auth boundary and Prisma 7.9.0 persistence owner.
- `packages/ui` — shared presentational React primitives.
- Docker Compose — PostgreSQL 16 with `auto_parts_dev` and `auto_parts_test`, exposed on host port `5433`.
- pnpm/Turborepo — workspace task graph, including `.next/**` and API `dist/**` build outputs.

The committed migration chain implements catalog and vehicle taxonomy, identity/supplier ownership, owner-aware commerce, inventory constraints and Internal Ops persistence. The API implements public discovery, Customer/guest commerce, supplier-scoped Cabinet operations, internal OMS/Returns/Notes/audit and Admin Listing moderation. The web application consumes those contracts through a same-origin `/api/*` rewrite, typed Zod projections and TanStack Query. Regression coverage includes migrations, fitment, auth/RBAC, commerce idempotency, supplier isolation, internal privacy, transition policies, frontend unit/component tests and guarded browser scenarios for role boundaries plus critical F2–F7 mutations.

## Application boundaries

- `apps/web` owns browser UI and routing. It never imports Prisma Client or connects to PostgreSQL.
- Browser requests use relative `/api/*` URLs with `credentials: "include"`; Next.js rewrites them server-side to `API_INTERNAL_URL`. Session and guest identities remain HttpOnly cookies and are never copied to browser storage.
- TanStack Query owns server state. A successful sign-out or identity-changing sign-in clears all prior query data before the new session is projected, preventing cross-role cache reuse.
- `apps/api` owns HTTP, authentication, authorization, domain services, Prisma schema/migrations and persistence orchestration.
- Controllers delegate to application/domain services; they do not construct Prisma clients.
- Shared packages must not depend on application code or own persistence concerns.

## Persistence boundary

`AppModule` imports the global `PrismaModule`, which exports one application-wide `PrismaService`. The service constructs Prisma Client with `PrismaPg`, connects during Nest module initialization and disconnects during module destruction. Domain services, including all commerce services, receive it through dependency injection.

Normal development reads `DATABASE_URL`. Under `NODE_ENV=test`, the provider requires `TEST_DATABASE_URL` and accepts only local `auto_parts_test`. Integration/e2e setup applies committed migrations before suites and never runs demo seed.

The standalone Prisma CLI seed process is the only additional Prisma Client boundary. It is not part of Nest runtime, is guarded to local `auto_parts_dev`, and creates synthetic idempotent demo records.

## Authentication and authorization boundary

`AuthModule` is the single Better Auth integration boundary and reuses the Prisma persistence owner. Supported authentication methods are email/password and Google OAuth. Linking Google to an existing account is an explicit, authenticated action: implicit linking is disabled, provider email must match the current account, and provider profile data does not overwrite the local user. A Google-only user may create a credential password through the authenticated `/api/v1/me/password` boundary; the API delegates to Better Auth's server-only password method and requires its sensitive-session check. Sessions are persisted; secrets and provider credentials come only from environment variables.

Authorization has two independent layers:

- RBAC guards/decorators enforce `CUSTOMER`, `SUPPLIER_USER`, `SUPPORT_MANAGER` and `ADMIN` permissions;
- supplier ownership verifies an active `SupplierUser` membership for the target Supplier.

Guest is represented by the absence of an authenticated session and is never persisted as a role.

## Catalog read boundary

`VehicleTaxonomyModule` exposes the public selector under `/api/v1/vehicles/*`. `GarageModule` owns authenticated SavedVehicle operations under `/api/v1/garage/vehicles`. `CatalogModule` exposes public catalog list and PDP routes under `/api/v1/catalog/products`.

Catalog controllers perform whitelist validation and delegate to injected services. Explicit taxonomy fields and owner-only `savedVehicleId` are normalized by one vehicle-context service. `FitmentService` is the shared policy for catalog compatibility filtering and PDP answers; exact-engine rules override generation-wide rules, while missing or incomplete coverage returns `unknown` or `caution` instead of a false compatibility claim.

Public queries return only `ACTIVE` Listings and explicit projections. PDP exposes derived availability and `{ id, name, slug }` Supplier data without exact inventory, memberships or auth records. Database filtering, pagination and sorting remain in PostgreSQL; nested relation access is bounded and contains no per-variant Prisma calls.

## Commerce boundary

`CommerceActorService` resolves a valid Customer session first and otherwise uses a server-issued opaque guest cookie whose SHA-256 hash is persisted. `CartModule`, `CheckoutModule` and `OrdersModule` apply this normalized owner directly in Prisma queries; missing and cross-owner Orders are indistinguishable.

`CheckoutService` re-reads active Listings inside a short transaction, conditionally reserves stock and creates a `PENDING_PAYMENT` Order with immutable OrderItem snapshots before any provider redirect. The Stripe Checkout call runs outside the transaction through one gateway. A failed provider call uses an idempotent compensating cancellation and stock release.

`PaymentsModule` is the public webhook boundary. It verifies Stripe's signature over exact raw bytes before domain lookup. One transaction stores the unique PaymentEvent, applies an allowed pending-state transition, appends OrderStatusEvent and releases stock when required. Browser redirects and Order GET routes are read-only and cannot set `PAID`.

`OrdersModule` exposes owner-only history, immutable detail and reason-coded timeline projections. Responses exclude PaymentEvent payloads, Stripe identifiers, guest hashes and internal membership data. Collections use bounded deterministic opaque-cursor pagination.

## Supplier Cabinet boundary

`SupplierCabinetModule` composes supplier Listing, inventory and OrderItem reads over the existing auth and Prisma boundaries. Supplier routes apply `SessionAuthGuard`, `RolesGuard`, `SupplierOwnershipGuard` and an active membership, then repeat `supplierId` in Prisma predicates as defense in depth. `ADMIN` bypass is explicit; `SUPPORT_MANAGER` has no implicit supplier access.

Listing lifecycle rules are centralized: Supplier creates `DRAFT`, submits for approval, pauses/resumes approved records and archives owned Listings; only Admin approves or rejects pending records. Public Catalog/PDP/Cart continue to select only `ACTIVE` Listings. Material catalog edits require renewed approval, while price and inventory edits preserve publication status.

Inventory writes use absolute quantity plus `expectedVersion`. Conditional updates prevent lost supplier writes, and checkout reservation/one-time release increments the same `inventoryVersion` in its stock transaction. A PostgreSQL check constraint prevents negative inventory.

Supplier OrderItem endpoints are read-only projections scoped through `OrderItem → Listing → supplierId`. Explicit selects expose immutable product snapshots, quantity/money and minimal Order status/timestamps while excluding customer/guest identity, addresses, PaymentEvent/Stripe internals, full Orders and other Suppliers' items. Collections use allowlisted filters and bounded deterministic cursor pagination.

## Internal Ops boundary

`InternalOpsModule` exposes SupportManager/Admin OMS Order reads and controlled transitions, Customer/Support ReturnRequest flows, internal Notes and ActivityLog reads. Central Order/Return policies own transition matrices; payment state remains outside this boundary and changes only through the verified Stripe webhook.

Notes and ActivityLog are internal-only explicit projections. State changes and their audit record share one Prisma transaction. Customer and Supplier APIs never select internal notes, audit metadata, payment payloads or cross-owner identity.

Admin Listing moderation reuses the centralized Listing transition policy. The global queue and approve/reject/emergency-pause routes require `ADMIN`; SupportManager receives no implicit moderation access. Reject and emergency pause require a supplier-visible reason, while Supplier cannot override an emergency pause. Catalog/PDP/Cart continue to expose only `ACTIVE` Listings.

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
Owner -> Cart -> CartItem -> Listing
Order -> PaymentEvent (unique externalEventId)
Order -> OrderStatusEvent
```

Order/payment transitions are explicit application-service operations guarded by expected current state. Payment events and status timeline records are append-only; unique external event identity prevents repeated webhook side effects. Shipping and refunds still have no runtime workflow.

## Not implemented

- supplier fulfillment and shipping workflows;
- payouts, refunds and external CRM/notification integrations;
- complete real-provider Google/Stripe release smoke and full manual accessibility/responsive evidence; measured Lighthouse baselines exist with an accepted local simulated-performance exception;
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
