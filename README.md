# Auto Parts Marketplace

Full-stack automotive marketplace that connects vehicle-aware product discovery, Customer and Guest commerce, Supplier inventory management, and internal marketplace operations in one role-secured platform.

The project is implemented as a production-oriented pnpm/Turborepo monorepo. Its current release status is **Conditional**: product milestones F0–F7 and redesign slices U0–U5 are complete, automated regressions are green, and the remaining release evidence is documented under [F8](docs/FRONTEND-MILESTONES.md) and [U6](docs/UI-UX-REDESIGN-PLAN.md).

## Product capabilities

### Customer and Guest experience

- Vehicle-first Garage with an active vehicle propagated into Catalog and PDP fitment requests.
- Public catalog with URL-owned search, filters, sorting, bounded pagination and server-authoritative availability.
- Product detail pages with explicit `compatible`, `incompatible`, `unknown` and `caution` fitment outcomes.
- Customer and HttpOnly-cookie Guest carts with server-calculated prices, stock, currencies and totals.
- Stripe Checkout redirect and owner-safe Order recovery; only a verified webhook can confirm payment.
- Owner-protected Order history, immutable OrderItem snapshots, timeline and Customer Return requests.

### Supplier workspace

- Active-membership-scoped Listing creation, editing and publication lifecycle.
- Optimistic inventory concurrency through `expectedVersion`, including `409` refetch/retry UX.
- Supplier-safe OrderItem projections without customer, payment or other Supplier data.
- Explicit Admin bypass for a known Supplier; no global Supplier directory is exposed.

### Internal and Admin workspace

- SupportManager/Admin Order and Return queues with controlled backend transitions.
- Internal Notes, redaction and append-only ActivityLog views.
- Admin-only Listing moderation with supplier-visible reject/pause reasons.
- Non-disclosing ownership errors and server-enforced role boundaries across every workspace.

## Architecture

```text
Browser
  -> Next.js 16 App Router
     -> React 19 + TanStack Query UI
     -> same-origin /api rewrite with HttpOnly cookies
  -> NestJS 11 API
     -> Better Auth sessions, RBAC and ownership guards
     -> domain services and server-authoritative transitions
  -> Prisma 7.9
  -> PostgreSQL 16
```

The browser never owns authorization, fitment truth, prices, inventory, payment status or lifecycle transitions. TanStack Query stores server state, while URL parameters store shareable Catalog and queue state. Sign-in and sign-out clear identity-bound cache data to prevent cross-role reuse.

## Repository map

```text
apps/web/       Next.js storefront, account and operational workspaces
apps/api/       NestJS API, Better Auth boundary and Prisma persistence owner
packages/ui/    Shared presentational primitives
docs/           Architecture, API plans, milestones and redesign evidence
```

## Technology

- Frontend: Next.js 16, React 19, TypeScript, TanStack Query, React Hook Form, Zod, Tailwind CSS, CSS Modules and shadcn/ui.
- Backend: NestJS 11, Better Auth 1.6.26, Prisma 7.9 and PostgreSQL 16.
- Quality: Vitest, Testing Library, MSW, Jest, Supertest, Playwright, Axe and Lighthouse CI.
- Tooling: pnpm 9, Turborepo and Docker Compose.

## Quality evidence

- Frontend unit/component regression: **36/36 files and 76/76 tests passed**.
- Deterministic Playwright coverage includes Customer, Guest, active/inactive SupplierUser, SupportManager and Admin contexts plus critical F2–F7 mutations.
- Automated Axe audit covers eight representative public, Customer, Supplier and Internal/Admin rendered states.
- Three-run Lighthouse measurements cover Home, Catalog, PDP, Supplier Listings and Internal Orders without persisting session cookies in reports.
- Automated accessibility scores are `96–100`, Best Practices scores are `96–100`, and measured CLS is `0` on all representative routes.
- A local Chrome audit reported Performance `75–78`; slower simulated-mobile measurements and the accepted readiness exception are recorded in the U6 log.

Automated checks complement rather than replace real Google OAuth, Stripe webhook and manual assistive-technology validation. The project must not be described as production-deployed until the remaining F8 evidence and Production Foundation work are complete.

## Local setup

Requirements: Node.js `>=22.12 <23`, pnpm `9`, Docker and Docker Compose.

Create `apps/api/.env` from `apps/api/.env.example` before running Prisma commands. Development uses the local `auto_parts_dev` database; tests accept only the guarded `auto_parts_test` database. Never commit populated Better Auth, Google or Stripe secrets.

```bash
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api prisma:seed
```

Run API and web in separate terminals:

```bash
pnpm --filter api start:dev
pnpm --filter web dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- PostgreSQL host port: `5433`

The browser calls relative `/api/*` paths. Next.js forwards them to the API while preserving same-origin HttpOnly session and Guest Cart cookies.

## Validation

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm --filter web test
pnpm --filter web test:e2e
pnpm --filter api test:int
pnpm --filter api test:e2e
git diff --check
```

Playwright uses an installed Chrome/Edge channel and a guarded local test database. It must never run against development, shared or production data. See the [web application README](apps/web/README.md) for targeted Axe and Lighthouse commands.

## Documentation

- [Current implementation context](docs/CONTEXT.md)
- [Architecture and security boundaries](docs/ARCHITECTURE.md)
- [Frontend milestones F0–F8](docs/FRONTEND-MILESTONES.md)
- [UI/UX redesign plan U0–U6](docs/UI-UX-REDESIGN-PLAN.md)
- [Backend implementation plan](docs/BACKEND-PLAN.md)
- [Catalog API plan](docs/CATALOG-API-PLAN.md)
- [Commerce API plan](docs/COMMERCE-API-PLAN.md)
- [Supplier Cabinet API plan](docs/SUPPLIER-CABINET-API-PLAN.md)
- [Internal Ops API plan](docs/INTERNAL-OPS-API-PLAN.md)

## Next workstream: Production Foundation

The approved public-demo topology is Vercel Hobby for Next.js, Render Free for
NestJS and Neon Free for PostgreSQL. PF0 establishes the environment contract
and a non-mutating repository lint gate; no hosting resource or deployment has
been created yet. The future deployment branch is `main`, and the repository
must remain private until its complete history passes a dedicated secret audit.

Use the non-mutating repository lint command for release/CI validation:

```bash
pnpm lint:check
```

The existing `pnpm lint` remains the developer autofix workflow because the API
package intentionally runs ESLint with `--fix`.

Prerequisites:

- complete the remaining manual/external evidence listed in F8;
- choose hosting and managed PostgreSQL providers;
- define environment ownership and secret rotation without adding secrets to Git;
- retain the measured Lighthouse baseline for post-deployment comparison.

Read [Architecture](docs/ARCHITECTURE.md), [Current context](docs/CONTEXT.md), [F8](docs/FRONTEND-MILESTONES.md) and [U6](docs/UI-UX-REDESIGN-PLAN.md) before implementation. Do not change auth/session semantics, backend ownership/RBAC, Stripe webhook authority, inventory concurrency, DTO privacy or Prisma schema without a separately reviewed plan. Wishlist, reviews, promotions, VIN lookup, onboarding, shipping, payouts, email flows and analytics are separate product milestones.

The complete staged implementation and approval gates are documented in the
[Production Foundation plan](docs/PRODUCTION-FOUNDATION-PLAN.md).
