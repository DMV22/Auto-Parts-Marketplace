# CONTEXT.md

## Product

Auto Parts Marketplace is an early-stage marketplace for automotive parts.

The implemented technical baseline is:

- Next.js frontend;
- NestJS backend;
- Prisma ORM with PostgreSQL;
- pnpm/Turborepo monorepo.

Product requirements and end-to-end marketplace workflows are not yet fully represented in the repository.

## Current repository baseline

At the time of this baseline:

- package manager: pnpm 9;
- workspace orchestration: Turborepo 2;
- Node.js engine: `>=22.12.0 <23`;
- frontend: Next.js 16 and React 19;
- backend: NestJS 11;
- language: TypeScript;
- ORM: Prisma `7.9.0` (`prisma`, `@prisma/client`, and `@prisma/adapter-pg`);
- database: PostgreSQL 16 through the repo-managed Docker Compose baseline;
- backend tests: Jest and Supertest, including database integration tests;
- frontend tests: not configured;
- authentication: not implemented;
- CI/CD and production deployment: not implemented.

Development and tests use separate local databases: `auto_parts_dev` and `auto_parts_test`. Connection-string formats are documented in `apps/api/.env.example`; real local credentials must remain outside Git.

## Repository map

```text
apps/
  web/                  Next.js App Router application
  api/                  NestJS API and Prisma persistence owner

packages/
  ui/                   Shared React UI primitives
  eslint-config/        Shared ESLint rules
  typescript-config/    Shared TypeScript configurations

docker/postgres/init/   Local PostgreSQL initialization
docker-compose.yml      PostgreSQL 16 development/test service
package.json            Root scripts and workspace metadata
pnpm-workspace.yaml     Workspace globs
turbo.json              Task graph and caching
pnpm-lock.yaml          Dependency lockfile
```

## Persistence and domain baseline

Prisma schema and committed migrations live in `apps/api/prisma`. The currently implemented persistence model contains only:

- `Part`: UUID, name, manufacturer, manufacturer part number, and timestamps; manufacturer plus part number is unique.
- `Vehicle`: UUID, make, model, year, and timestamps; make, model, and year are unique as a tuple.
- `Fitment`: explicit Part-to-Vehicle relation with a composite primary key `(partId, vehicleId)` and a creation timestamp.

Deleting a Part or Vehicle cascades to its Fitment rows. Foreign keys reject relations to missing parents. `Listing`, `Order`, checkout, payment, shipping, authentication, and public domain CRUD endpoints are not implemented.

## Local database and API workflow

Use `apps/api/.env.example` as the format reference for local `DATABASE_URL` and `TEST_DATABASE_URL`. Do not commit the resulting local environment file.

From the repository root:

```bash
docker compose up -d postgres
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api start:dev
```

Use `prisma:migrate:dev` only when intentionally creating a new reviewed development migration. Use `prisma:migrate:deploy` to apply committed migrations without editing migration history.

## Tests

```bash
pnpm --filter api test
pnpm --filter api test:int
pnpm --filter api test:e2e
```

Integration and e2e suites require `TEST_DATABASE_URL`. Their shared setup rejects non-local URLs and any database name other than `auto_parts_test`, then applies committed migrations before the suite. Tests clean up their own records without resetting or dropping the database.

Update this document whenever the stack, persistence model, or implemented product boundaries change.
