# Auto Parts Marketplace API

NestJS 11 backend for Auto Parts Marketplace. It uses Prisma 7.9.0, PostgreSQL 16 and Better Auth 1.6.26. The implemented foundation includes catalog/vehicle compatibility persistence, session authentication, RBAC, supplier ownership and status-bearing commerce records. Public marketplace workflows are not implemented yet.

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
# Unit tests, including database URL guards and authorization rules
pnpm --filter api test

# PostgreSQL schema, migration and persistence integration tests
pnpm --filter api test:int

# Better Auth, session, RBAC and ownership HTTP tests
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

The Nest application exposes the Better Auth/session boundary and authorization infrastructure. Catalog, listing, cart, checkout, order, payment and return endpoints remain future milestones.
