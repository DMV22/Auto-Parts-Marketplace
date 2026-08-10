# Auto Parts Marketplace API

NestJS 11 API for Auto Parts Marketplace. Persistence is owned by this workspace and uses Prisma 7.9.0 with PostgreSQL 16. The current database model contains `Part`, `Vehicle`, and `Fitment`; public domain endpoints are not implemented yet.

Run project commands from the repository root with Node.js `>=22.12.0 <23` and pnpm.

## Setup & migrations

Use `apps/api/.env.example` as the format reference for `DATABASE_URL` and `TEST_DATABASE_URL`. Keep the populated local environment file and real credentials out of Git.

```bash
docker compose up -d postgres
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
pnpm --filter api start:dev
```

Use `pnpm --filter api prisma:migrate:dev -- --name <migration-name>` only when intentionally creating a new reviewed migration. Do not edit migration files that have already been applied. The Compose service provides separate `auto_parts_dev` and `auto_parts_test` databases.

## Tests

```bash
# Unit tests
pnpm --filter api test

# PostgreSQL integration tests
pnpm --filter api test:int

# Supertest end-to-end tests
pnpm --filter api test:e2e
```

Integration and e2e tests require `TEST_DATABASE_URL` pointing to local `auto_parts_test`. Their shared setup validates the target and applies committed migrations before each suite; it refuses development, production, remote, or differently named databases.

## Other checks

```bash
pnpm --filter api lint
pnpm --filter api build
```
