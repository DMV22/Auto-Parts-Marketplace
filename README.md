# Auto Parts Marketplace

pnpm/Turborepo monorepo for a Next.js marketplace frontend, NestJS API and shared TypeScript packages.

## Stack

- Next.js 16, React 19, TanStack Query, Tailwind CSS and shadcn/ui;
- NestJS 11, Better Auth and Prisma 7.9;
- PostgreSQL 16 through Docker Compose;
- Vitest/MSW/Testing Library, Jest/Supertest and Playwright.

## Repository map

```text
apps/web/       App Router frontend and frontend tests
apps/api/       NestJS API, Prisma schema/migrations and backend tests
packages/ui/    Shared presentational primitives
docs/           Architecture and milestone contracts
```

## Local setup

Requirements: Node.js `>=22.12 <23`, pnpm `9`, Docker and Docker Compose.

```bash
pnpm install --frozen-lockfile
docker compose up -d postgres
pnpm --filter api prisma:validate
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate:deploy
```

Create `apps/api/.env` from `apps/api/.env.example`. Development uses `auto_parts_dev`; tests must use the guarded `auto_parts_test` database. Keep real Better Auth, Google and Stripe secrets outside Git.

Run API and web in separate terminals:

```bash
pnpm --filter api start:dev
pnpm --filter web dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- PostgreSQL host port: `5433`

The browser calls same-origin `/api/*`; Next.js rewrites requests to the API and preserves HttpOnly session/guest cookies.

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

Frontend Playwright uses the guarded `auto_parts_test` database and an installed Chrome/Edge channel. Do not run it against development or production data.

## Documentation

- [Current context](docs/CONTEXT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Frontend milestones](docs/FRONTEND-MILESTONES.md)
- [Backend plan](docs/BACKEND-PLAN.md)
