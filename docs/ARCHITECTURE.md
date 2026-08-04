# ARCHITECTURE.md

## Purpose

Auto Parts Marketplace is intended to let users discover, list, and manage automotive parts through a web application backed by an API and PostgreSQL database.

Business capabilities are still being defined. Do not invent checkout, payment, shipping, moderation, or compatibility behavior without an accepted requirement.

## Current state

The repository currently contains:

- `apps/web` — Next.js 16 App Router application using React 19.
- `apps/api` — NestJS 11 HTTP API with Prisma 7.9.0 persistence.
- `packages/ui` — shared React UI primitives.
- `packages/eslint-config` — shared ESLint configuration.
- `packages/typescript-config` — shared TypeScript configuration.
- Turborepo orchestration through `turbo.json`.
- pnpm workspaces through `pnpm-workspace.yaml`.
- PostgreSQL 16 development/test infrastructure through Docker Compose.

The API has a committed Prisma schema and migration for `Part`, `Vehicle`, and their explicit `Fitment` relation. Database integration tests cover reads/writes, uniqueness, foreign keys, and cascade deletion. No public Part/Vehicle/Fitment controllers are implemented yet.

Not implemented yet:

- `Listing` or `Order` persistence and workflows;
- checkout, payment, shipping, or moderation;
- authentication and authorization;
- production API contract for the domain model;
- frontend-to-API integration;
- media storage;
- production database provisioning, secrets, backups, monitoring, or deployment architecture.

## Boundaries

- `apps/web` contains UI, routing, and browser-facing concerns. It does not import Prisma Client or access PostgreSQL directly.
- `apps/api` owns HTTP endpoints, validation, business services, Prisma schema/migrations, and persistence orchestration.
- `packages/ui` is for reusable presentational components. Do not add data fetching or business logic there.
- Shared configuration packages (`eslint-config`, `typescript-config`) should not depend on application code.

## Persistence boundary

`PrismaModule` is imported by the API `AppModule` and exposes the single application-wide `PrismaService` provider. `PrismaService` constructs Prisma Client with the PostgreSQL driver adapter, connects during Nest module initialization, and disconnects during module destruction.

Future domain services receive `PrismaService` through Nest dependency injection. Controllers must call domain/application services instead of creating Prisma clients or querying the database directly. No other application or shared package owns a Prisma Client instance.

For normal development, the provider reads `DATABASE_URL`. Under `NODE_ENV=test`, it requires `TEST_DATABASE_URL` and accepts only the local `auto_parts_test` database. Integration and e2e suites apply committed migrations before running and use the same injected provider as the application.

## System context

```text
Browser
   |
   v
Next.js web application
   |
   | future HTTPS / versioned API contract
   v
NestJS controller and application service
   |
   | dependency injection
   v
PrismaModule / PrismaService
   |
   | Prisma Client + PostgreSQL adapter
   v
PostgreSQL 16
```

The browser-to-domain API path is a target boundary, not a claim that marketplace endpoints or workflows are already implemented.
