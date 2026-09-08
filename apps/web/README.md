# Auto Parts Marketplace — Web

Next.js 16 App Router frontend for public catalog/fitment, Customer and Guest commerce, Supplier Cabinet and Internal Ops.

## Runtime boundary

- Browser requests use relative `/api/*` URLs and always include cookies.
- `next.config.js` rewrites those requests to the server-only `API_INTERNAL_URL` (default `http://localhost:3001`).
- Better Auth session and guest-cart identity stay in HttpOnly cookies. Do not copy them into `localStorage` or `sessionStorage`.
- NestJS remains authoritative for roles, ownership, prices, stock, fitment, transitions and payment state.
- TanStack Query owns server state; sign-in/sign-out clears all cached query data before the next identity is used.

The public demo is available at <https://auto-parts-marketplace-web-bqbz.vercel.app>. Vercel is the only browser-facing origin and `API_INTERNAL_URL` points server-side to <https://auto-parts-marketplace-api.onrender.com>. Google callbacks and normal browser API requests continue through Vercel `/api/*`; Stripe sandbox webhooks call the signed Render endpoint directly. Do not expose the upstream as `NEXT_PUBLIC_*` or change browser requests to call Render directly.

Render Free may cold-start after idle. The current UI keeps a recoverable loading state and resumes when the API wakes; this demo does not promise production-grade availability or latency.

Google OAuth is supported only on the stable production Vercel domain. Preview deployments are not registered as Google callback origins. The consent screen is public, so a user who chooses Google sign-in creates a minimal identity record; do not enter real addresses or payment information in this portfolio demo. See [Google OAuth public-demo runbook](../../docs/GOOGLE-OAUTH-STAGING-RUNBOOK.md).

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
pnpm --filter web lint:check
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web build
pnpm --filter web test:e2e
```

The guarded E2E runner requires `TEST_DATABASE_URL` to target exactly `auto_parts_test`, applies committed migrations, builds the web app and uses an already-installed Chrome/Edge channel. It does not require live Stripe credentials or download browsers. The default `test:e2e` command covers platform/auth, role isolation, accessibility and deterministic critical F2–F7 mutations; Lighthouse is a separate measured gate because an accepted local performance exception must not make the product regression command fail.

Run the automated accessibility smoke against an existing production build:

```bash
pnpm --filter web build
pnpm --filter web test:a11y --reuse-build
```

Lighthouse uses three runs and evaluates their median. Run one route at a time to keep local validation bounded:

```bash
pnpm --filter web test:lighthouse --reuse-build --grep "on home$"
pnpm --filter web test:lighthouse --reuse-build --grep "on catalog$"
pnpm --filter web test:lighthouse --reuse-build --grep "on PDP$"
pnpm --filter web test:lighthouse --reuse-build --grep "on Supplier Listings$"
pnpm --filter web test:lighthouse --reuse-build --grep "on Internal Orders$"
```

Hosted Google callback/session recovery, Stripe test-mode webhook forwarding,
all four persisted role contexts and manual screen-reader/responsive checks were
completed without an observed critical/high defect. The formally accepted
Lighthouse exception and Render Free cold start keep the overall public-demo
release `Conditional`. Never place OAuth codes, access tokens, cookies, Stripe
secrets or customer data in reports.

See [Frontend milestones](../../docs/FRONTEND-MILESTONES.md) and [Architecture](../../docs/ARCHITECTURE.md).
