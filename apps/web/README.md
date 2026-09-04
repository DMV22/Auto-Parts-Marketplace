# Auto Parts Marketplace — Web

Next.js 16 App Router frontend for public catalog/fitment, Customer and Guest commerce, Supplier Cabinet and Internal Ops.

## Runtime boundary

- Browser requests use relative `/api/*` URLs and always include cookies.
- `next.config.js` rewrites those requests to the server-only `API_INTERNAL_URL` (default `http://localhost:3001`).
- Better Auth session and guest-cart identity stay in HttpOnly cookies. Do not copy them into `localStorage` or `sessionStorage`.
- NestJS remains authoritative for roles, ownership, prices, stock, fitment, transitions and payment state.
- TanStack Query owns server state; sign-in/sign-out clears all cached query data before the next identity is used.

## Local development

Create `apps/web/.env.local` from `.env.example` only when the API does not run at the default URL:

```env
API_INTERNAL_URL=http://localhost:3001
```

Start PostgreSQL and the API from the repository root, then start the web app:

```bash
docker compose up -d postgres
pnpm --filter api prisma:migrate:deploy
pnpm --filter api start:dev
pnpm --filter web dev
```

Open `http://localhost:3000`. Better Auth must use `BETTER_AUTH_URL=http://localhost:3000`; the local Google callback is `http://localhost:3000/api/auth/callback/google`.

## Verification

```bash
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web build
pnpm --filter web test:e2e
```

The guarded E2E runner requires `TEST_DATABASE_URL` to target exactly `auto_parts_test`, applies committed migrations, builds the web app and uses an already-installed Chrome/Edge channel. It does not require live Stripe credentials or download browsers. Playwright covers platform/auth and deterministic critical F2–F7 mutations; real Google callback, Stripe webhook forwarding, Lighthouse and manual accessibility/responsive checks remain F8 release evidence.

See [Frontend milestones](../../docs/FRONTEND-MILESTONES.md) and [Architecture](../../docs/ARCHITECTURE.md).
