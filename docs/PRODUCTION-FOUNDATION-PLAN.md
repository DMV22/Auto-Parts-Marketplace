# Production Foundation for Public Demo

## Status

`In progress` — PF0–PF1 завершено в repository; provider resources і deployment
ще не створені.

## Summary

Цей workstream готує Auto Parts Marketplace до безпечного публічного
portfolio/demo staging без live-платежів і реальних клієнтських даних.

Погоджена безкоштовна topology:

```text
Browser
  -> Vercel Hobby: Next.js (`https://<web-project>.vercel.app`)
     -> same-origin `/api/*` rewrite
        -> Render Free: NestJS (`https://<api-service>.onrender.com`)
           -> Neon Free: PostgreSQL

Stripe sandbox
  -> HTTPS POST directly to Render `/api/v1/webhooks/stripe`

Google OAuth
  -> callback through Vercel `/api/auth/callback/google`
     -> same-origin rewrite to Render
```

Vercel залишається єдиною browser-facing origin. Це зберігає чинну модель
HttpOnly Better Auth session і Guest Cart cookies без залежності від
third-party cookies. Render URL є server-side upstream для Next.js rewrite і
окремим публічним endpoint для Stripe test webhook.

## Goal

Після завершення workstream має існувати відтворюване demo-середовище, у якому:

- Next.js, NestJS і PostgreSQL розгорнуті як окремі runtime boundaries;
- браузер звертається до API тільки через same-origin `/api/*`;
- Google OAuth працює через точний staging callback;
- Stripe Checkout працює лише в test mode, а `PAID` встановлює тільки
  signature-verified webhook;
- migrations виконуються контрольовано до application smoke;
- secrets зберігаються лише у provider environment stores;
- health, logs, security baseline і rollback procedure задокументовані;
- automated regression і ручний staging smoke мають зафіксований evidence;
- README та readiness-документація чесно називають середовище public demo, а не
  production для реальних користувачів.

## Non-goals

- live Stripe payments, payouts або refunds;
- реальні клієнтські, платіжні чи персональні дані;
- production-scale availability, autoscaling або zero-downtime guarantees;
- shipping, supplier fulfillment, onboarding, email delivery або analytics;
- wishlist, reviews, promotions, VIN lookup чи інші product features;
- зміна auth/session semantics, RBAC, ownership, inventory concurrency,
  payment authority або Prisma schema без окремого погодженого плану;
- автоматичний seed будь-якої production database;
- купівля домену або платних provider plans у межах першого demo release;
- Sentry, OpenTelemetry чи інший monitoring SDK без окремого погодження
  dependency та data-retention policy.

## Decisions

| Decision             | Accepted value                 | Consequence                                                        |
| -------------------- | ------------------------------ | ------------------------------------------------------------------ |
| Web hosting          | Vercel Hobby                   | Персональне некомерційне portfolio use; один browser-facing origin |
| API hosting          | Render Free Web Service        | Допустимий cold start після idle; ephemeral filesystem             |
| Database             | Neon Free PostgreSQL           | Managed external DB; можливий compute wake-up latency              |
| Domains              | Provider HTTPS domains         | Без DNS/custom-domain робіт у першій версії                        |
| Browser API topology | Vercel same-origin rewrite     | Session і Guest Cart cookies залишаються first-party               |
| Payments             | Stripe sandbox/test mode only  | Жодних live keys, charges або production customer data             |
| Logs                 | Vercel/Render provider logs    | Без нового SDK на першому етапі                                    |
| Docker               | Не обов'язковий для deployment | Compose залишається local parity tool                              |
| Free-tier latency    | Прийнятна для demo             | Потрібні зрозумілий smoke і documented cold-start limitation       |

## Context inspected

- `README.md`, `apps/web/README.md`, `apps/api/README.md`;
- `docs/CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/PLANS.md`;
- F8 у `docs/FRONTEND-MILESTONES.md` і U6 у
  `docs/UI-UX-REDESIGN-PLAN.md`;
- root, web і API `package.json`, `pnpm-workspace.yaml`, `turbo.json`;
- `apps/web/next.config.js`, `apps/web/.env.example` і API client;
- API bootstrap, Better Auth factory/body-parser boundary, Checkout config і
  Stripe webhook controller/service;
- Prisma runtime/config і development/test database guards;
- `docker-compose.yml` лише як local development reference;
- офіційна документація Vercel, Render, Neon, Better Auth і Stripe, наведена в
  розділі References.

## Current behavior and gaps

### Already suitable

- Browser requests already use relative `/api/*` paths with
  `credentials: "include"`.
- `next.config.js` already proxies `/api/*` to server-only
  `API_INTERNAL_URL`.
- Better Auth cookies are HttpOnly, `SameSite=Lax` і `Secure` у
  `NODE_ENV=production`.
- Better Auth requires explicit `BETTER_AUTH_URL`.
- Stripe webhook verifies the signature over exact raw bytes.
- Payment transition validates Checkout Session ID, Order ID, currency and
  amount, and is idempotent by external Event ID.
- The API listens on provider-supplied `PORT`.
- Committed Prisma migrations and `prisma:migrate:deploy` exist.

### Gaps to close

- deployment configuration and CI/CD do not exist;
- API exposes only a generic root response, not explicit liveness/readiness;
- startup environment is validated piecemeal instead of as one readiness gate;
- the committed API `lint` script includes `--fix` and is unsuitable as a
  read-only CI validation command;
- public-demo rate limiting and security-header evidence are absent;
- no hosted PostgreSQL migration/runbook has been rehearsed;
- the current seed intentionally accepts only local `auto_parts_dev` and must
  not be pointed at Neon;
- provider logs have no documented redaction/retention checklist;
- staging Google and Stripe registrations do not yet exist;
- Render cold start and Neon wake-up behavior have not been measured;
- U6/F8 still contain unresolved external/manual evidence.

## Environment contract

Never place values from this table in Git, issues, screenshots, test reports or
chat. Record only variable names and `configured/missing` status.

### Vercel web project

| Variable           | Classification            | Purpose                                           |
| ------------------ | ------------------------- | ------------------------------------------------- |
| `API_INTERNAL_URL` | Server-only configuration | Exact Render HTTPS origin, without trailing slash |

No `NEXT_PUBLIC_*` secret or API upstream variable is required. The browser
continues to call relative `/api/*`.

### Render API service

| Variable                      | Classification            | Purpose                                                                |
| ----------------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`                    | Configuration             | Must be `production` for secure cookies                                |
| `DATABASE_URL`                | Secret                    | Neon runtime connection, preferably pooled and TLS-enabled             |
| `BETTER_AUTH_SECRET`          | Secret                    | Unique staging-only secret, at least 32 characters                     |
| `BETTER_AUTH_URL`             | Configuration             | Canonical Vercel HTTPS origin                                          |
| `GOOGLE_CLIENT_ID`            | Secret-managed credential | Staging OAuth client identifier                                        |
| `GOOGLE_CLIENT_SECRET`        | Secret                    | Staging OAuth client secret                                            |
| `STRIPE_SECRET_KEY`           | Secret                    | Stripe test-mode secret key only                                       |
| `STRIPE_WEBHOOK_SECRET`       | Secret                    | Secret of the registered staging endpoint, not the CLI listener secret |
| `STRIPE_CHECKOUT_SUCCESS_URL` | Configuration             | Vercel `/checkout/success` absolute HTTPS URL                          |
| `STRIPE_CHECKOUT_CANCEL_URL`  | Configuration             | Vercel `/checkout/cancel` absolute HTTPS URL                           |

Render supplies `PORT`; do not hard-code or override it unless provider
configuration requires it. `TEST_DATABASE_URL` must not be configured in the
public demo runtime.

### Operator-only migration environment

- Use a Neon direct TLS connection for `prisma migrate deploy` when the chosen
  pooled endpoint is not suitable for migrations.
- Supply it temporarily as `DATABASE_URL` from a trusted operator environment.
- Never print, paste into documentation or commit the connection string.
- The runtime can use Neon's pooled connection because the long-running API
  uses the PostgreSQL driver adapter.

## Delivery milestones

### PF0 — Configuration contract and repository gate

**Agent implements**

- [x] Confirm exact Vercel and Render project root/build behavior for this pnpm
      workspace.
- [x] Add a non-mutating API lint command or change the existing script so CI
      does not rewrite source files.
- [x] Add centralized startup validation for required production variables
      without logging their values.
- [x] Document local, test and public-demo environment separation.
- [x] Define one deployment branch and required quality checks.

**User performs manually**

- [x] Confirm Git provider/repository visibility policy and deployment branch.
- [ ] Create free Vercel, Render and Neon accounts if they do not exist.

**Acceptance evidence**

- Missing or malformed required configuration fails before the API accepts
  traffic.
- Validation logs contain variable names only, never secret values.
- Local development and guarded test database workflows remain unchanged.

#### PF0 implementation log

- Майбутня deployment branch — `main`. Репозиторій залишається private, доки
  окрема перевірка повної Git history не підтвердить відсутність secrets.
- Vercel використовуватиме `apps/web` як project Root Directory і чинний
  Next.js same-origin rewrite. Render використовуватиме repository root, тому
  build матиме доступ до кореневих `pnpm-lock.yaml`, `pnpm-workspace.yaml` і
  Turborepo configuration; точні provider commands будуть зафіксовані у PF3/PF4.
- Додано pure startup validator, який до `NestFactory.create()` перевіряє
  database, Better Auth, Google, Stripe, Checkout URLs і `PORT`. Повідомлення
  містять лише назви змінних і безпечні причини помилок.
- Production/public-demo profile вимагає HTTPS auth/Checkout origin,
  non-local PostgreSQL із `sslmode=require`, Stripe test key, webhook secret і
  відсутність `TEST_DATABASE_URL`. Це навмисно не є contract для майбутніх live
  payments.
- Додано `lint:check` у root/web/API. Старий API `lint --fix` збережено як
  явний developer workflow. Щоб repository gate став зеленим, механічно
  відформатовано наявні lint findings і видалено тільки неактуальні
  `eslint-disable` directives без зміни поведінки.
- Несекретні provider settings надалі можуть бути committed as code, якщо це
  підтримує free tier; усі credentials і environment values залишаються лише в
  provider dashboards.
- Demo credentials не комітяться: Customer може створити власний demo account,
  а privileged access видається контрольовано. Synthetic hosted data потребує
  окремого одноразового ручного allowlisted bootstrap; чинний local seed guard
  не обходиться.

#### PF0 validation results

- `pnpm --filter api test -- environment.spec.ts` — passed: `11/11` tests.
- Targeted ESLint для startup validator і API bootstrap — passed.
- `pnpm --filter api build` — passed.
- `pnpm --dir apps/web build` — passed із `apps/web` як working/root directory;
  Next.js зібрав усі 17 route entries.
- `pnpm lint:check` — passed: `2/2` Turborepo tasks, без зміни файлів.
- Database, migrations, seed, provider APIs і deployment не запускалися.

#### PF0 handoff to PF1

PF1 має додати liveness/readiness, security headers, log-redaction audit і
вузьке rate limiting. До початку потрібно окремо погодити можливу dependency та
конкретні demo rate limits. PF1 не повинен створювати provider resources,
послаблювати auth/RBAC або повертати environment/database metadata з health
responses.

### PF1 — API health and minimum security baseline

**Agent implements**

- [x] Add lightweight unauthenticated liveness and readiness endpoints.
- [x] Liveness verifies the process only; readiness performs a bounded database
      connectivity check without returning database metadata.
- [x] Add standard secure response headers without changing application DTOs.
- [x] Add narrowly scoped rate limiting for authentication and mutation-heavy
      public boundaries. Any new dependency requires explicit approval.
- [x] Audit logs so authorization headers, cookies, OAuth codes, Stripe
      signatures, webhook bodies and database URLs are never emitted.
- [x] Add targeted tests for health, headers and rate-limit behavior.

**User performs manually**

- [x] Approve any required dependency and the demo-appropriate rate limits.
- [ ] Configure the readiness path as Render's HTTP health check.

**Acceptance evidence**

- Health responses contain no sensitive or environment-identifying fields.
- Security headers are visible on representative web/API responses.
- Normal Catalog and role-aware flows do not receive false-positive throttling.

#### PF1 implementation log

- Додано unauthenticated `GET /api/v1/health/live`, який перевіряє лише процес,
  і `GET /api/v1/health/ready`, який виконує `SELECT 1` з application-level
  timeout `2 s`. Обидві відповіді містять тільки `status`; readiness failure
  повертає `503` без exception, environment або database metadata.
- Додано `helmet@8.3.0` і `@nestjs/throttler@6.5.0`. Helmet застосовується до
  API без strict CSP; Next.js додає `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` і обмежений `Permissions-Policy`. CSP відкладено до hosted
  OAuth/Stripe validation, щоб не змінити чинні інтеграційні потоки навмання.
- In-memory demo limits мають фіксоване вікно `60 s`: Better Auth sensitive
  sign-in/sign-up/linking і authenticated password creation — `10`, Checkout
  creation — `5`, Guest/Customer Cart mutations — `30`. Catalog/read routes і
  Stripe webhook не використовують Nest limiter; тому webhook retries та
  звичайна навігація не потрапляють під ці бюджети.
- Runtime log audit по `apps/api/src` не знайшов `Logger` або `console` calls.
  Наявна обробка auth headers, cookies, OAuth/Stripe inputs і database URLs не
  додає їх до logs. Provider-side request logging потрібно повторно перевірити
  після створення Render service у PF3/PF7.
- In-memory throttling є свідомим обмеженням single-instance free demo: counters
  скидаються після restart і не є production-scale distributed protection.

#### PF1 validation results

- `pnpm --filter api test -- health.service.spec.ts rate-limit.spec.ts
configure-security-http.spec.ts` — passed: `3/3` suites, `9/9` tests.
- `pnpm --filter web test -- security-headers.spec.ts` — passed: `1/1` test.
- Targeted non-mutating ESLint для змінених API та web PF1 files — passed.
- `pnpm --filter api build` — passed.
- `git diff --check` — passed; локальні LF → CRLF повідомлення informational.
- Database connections, migrations, seed, provider APIs і external services не
  запускалися.

#### PF1 handoff to PF2

Repository-side PF1 завершено. Після створення Render service користувач має
встановити `/api/v1/health/ready` як HTTP health-check path і підтвердити headers
та limiter behavior через HTTPS. PF2 має підготувати лише guarded Neon migration
і synthetic-data runbook; жодне підключення, migration або seed не виконується
без окремого sanitized-target review та approval.

### PF2 — Neon database and migration procedure

**Agent implements**

- [ ] Document the exact `prisma:validate`, `prisma:generate` and
      `prisma:migrate:deploy` sequence.
- [ ] Add a guarded, operator-driven migration runbook with preflight target
      inspection and post-migration status verification.
- [ ] Define backup/export expectations appropriate to a free demo database.
- [ ] Design, but do not silently enable, a one-time synthetic demo-data
      bootstrap path.

**User performs manually**

- [ ] Create one dedicated Neon public-demo project/database.
- [ ] Add its connection values only to approved secret stores.
- [ ] Review the sanitized database host/name before each migration or data
      bootstrap.
- [ ] Explicitly approve any one-time demo-data operation.

**Data policy**

- The existing `prisma:seed` guard accepts only local `auto_parts_dev`; it must
  not be bypassed ad hoc or used as a deployment hook.
- Hosted demo data must be synthetic and contain no password Accounts,
  Sessions, OAuth tokens, real addresses or payment identifiers.
- A hosted bootstrap, if approved later, must be manual, idempotent,
  allowlisted to the exact staging target and separately documented.
- Empty database deployment is technically valid but does not provide a useful
  marketplace demonstration; the content strategy must be decided before the
  public launch.

**Acceptance evidence**

- All committed migrations are applied exactly once.
- API readiness succeeds against Neon.
- No local test fixtures or development credentials are present in staging.

### PF3 — Render API deployment

**Agent implements**

- [ ] Add only the minimal provider configuration needed for a pnpm/Turborepo
      monorepo, if dashboard configuration alone is insufficient.
- [ ] Define reproducible install, Prisma generation, API build and production
      start commands.
- [ ] Ensure runtime uses `node dist/main` and the provider `PORT`.
- [ ] Configure deploy triggers so unrelated documentation-only changes do not
      cause unnecessary API builds where supported.
- [ ] Document cold-start behavior and webhook recovery procedure.

**User performs manually**

- [ ] Connect the repository and create the Render Free Web Service.
- [ ] Configure environment variables without sharing their values.
- [ ] Set the HTTP health-check path and inspect the first deploy logs.

**Acceptance evidence**

- API build uses the committed lockfile and compatible Node/pnpm versions.
- Liveness and readiness return success over HTTPS.
- Restarting or redeploying does not depend on local filesystem persistence.
- A cold request recovers within the documented demo tolerance.

### PF4 — Vercel web deployment and same-origin proxy

**Agent implements**

- [ ] Confirm the Vercel Root Directory/workspace configuration builds
      `apps/web` without losing required workspace files.
- [ ] Retain the existing Next.js `/api/:path*` rewrite and validate the
      external Render HTTPS destination.
- [ ] Ensure `API_INTERNAL_URL` remains server-only.
- [ ] Add a user-safe recoverable API-unavailable/cold-start presentation only
      if staging smoke demonstrates an actual UX blocker.

**User performs manually**

- [ ] Connect the repository and create the Vercel Hobby project.
- [ ] Configure `API_INTERNAL_URL` with the Render origin.
- [ ] Record the stable Vercel production URL used by OAuth and Checkout.

**Acceptance evidence**

- Browser network requests target the Vercel origin under `/api/*`, not Render
  directly.
- Session and Guest Cart cookies are HttpOnly, Secure, first-party and absent
  from browser storage.
- Refresh, sign-in, sign-out and Guest Cart persistence work through the proxy.

### PF5 — Google OAuth staging readiness

**Agent implements**

- [ ] Document the exact public callback path and safe `returnTo` checks.
- [ ] Retain explicit account linking and authenticated password-creation
      behavior; do not enable implicit email linking.
- [ ] Add or update only regression tests required by a reproduced staging
      proxy/callback problem.

**User performs manually**

- [ ] Create or configure a staging Google OAuth client.
- [ ] Add the Vercel HTTPS origin and exact callback:
      `https://<web-project>.vercel.app/api/auth/callback/google`.
- [ ] Store client credentials only in Render environment settings.
- [ ] Complete real sign-in, callback, refresh, explicit linking and sign-out
      checks without sharing codes, tokens or cookies.

**Acceptance evidence**

- OAuth callback returns through Vercel and establishes a server-issued Secure
  HttpOnly session.
- Existing email/password and Google-only account flows remain valid.
- Unsafe external `returnTo` values are rejected.

### PF6 — Stripe sandbox webhook readiness

**Agent implements**

- [ ] Document the Render endpoint:
      `https://<api-service>.onrender.com/api/v1/webhooks/stripe`.
- [ ] Preserve raw-body signature verification and webhook-only payment
      authority.
- [ ] Confirm only the currently supported events are subscribed:
      `checkout.session.completed`,
      `checkout.session.async_payment_succeeded`,
      `checkout.session.async_payment_failed`, and
      `checkout.session.expired`.
- [ ] Add provider-safe diagnostics containing request/event correlation IDs
      only; never log the signature or payload.
- [ ] Document Stripe Dashboard resend and delayed-event recovery.

**User performs manually**

- [ ] Create a Stripe sandbox/test-mode webhook destination for the Render URL.
- [ ] Put its endpoint-specific signing secret only in Render settings.
- [ ] Keep Checkout success/cancel redirects on the Vercel origin.
- [ ] Run a sanctioned test Checkout and record only pass/fail, HTTP status and
      nonsensitive timestamps.

**Acceptance evidence**

- Before verified webhook: Order is `PENDING_PAYMENT`.
- After consistent signed paid webhook: Order is `PAID` exactly once.
- Duplicate delivery does not repeat state or stock effects.
- Expired/failed pending Checkout cancels once and releases stock once.
- Invalid signatures return `400`; consistency failures remain retryable.
- Stripe test mode is visually and operationally confirmed; no live key exists
  in the environment.

**Free-tier note**

Checkout creation itself warms the Render API shortly before Stripe delivers
the event. If a delivery still fails during cold start, Stripe sandbox retry or
manual Dashboard resend is the recovery mechanism. Do not weaken webhook
authority or mark an Order paid from the browser redirect.

### PF7 — Deployment automation and validation gate

**Agent implements**

- [ ] Add a minimal CI quality workflow only after repository visibility,
      branch and secret policy are confirmed.
- [ ] Keep unit/static gates separate from database-backed integration/E2E
      jobs.
- [ ] Prevent tests from targeting Neon: existing test guards must continue to
      accept only local `auto_parts_test`.
- [ ] Add a post-deployment smoke script or checklist that performs read-only
      health/public checks before any mutation scenario.
- [ ] Re-run the smallest affected regression after each foundation slice, then
      one final agreed gate.

**User performs manually**

- [ ] Approve provider deployments and secret/environment changes.
- [ ] Perform OAuth, Stripe and manual accessibility/responsive staging smoke.
- [ ] Confirm public-demo wording and shareable URL.

**Acceptance evidence**

- Required checks are green for the deployed revision.
- Staging smoke records revision, provider URLs, browser and pass/fail without
  secrets or personal data.
- Rollback to the last known-good Vercel/Render deployment is rehearsed or
  documented.

### PF8 — Documentation synchronization and release decision

**Agent implements**

- [ ] Update root/web/API README deployment sections from actual results.
- [ ] Update `docs/CONTEXT.md` and `docs/ARCHITECTURE.md` with the deployed
      topology.
- [ ] Synchronize F8/U6 evidence without rewriting historical results.
- [ ] Record limitations, incidents, accepted exceptions and final status.

**User performs manually**

- [ ] Confirm that the deployed environment contains synthetic demo data only.
- [ ] Confirm whether the shareable demo is public continuously or started on
      demand because of free-tier limitations.

**Release decision**

- `Ready for public demo`: all blocking checks below pass and no critical/high
  defect remains.
- `Conditional`: the demo is shareable but has a documented accepted limitation
  such as cold-start latency or an uncompleted noncritical manual check.
- `Blocked`: auth, ownership, payment authority, migration safety, secret
  handling or critical user flow is broken.

This decision never means “production-ready for real customers.”

## Minimal command mapping

Commands are run from the repository root. No command below contains a secret.

| Purpose                    | Existing command                          |
| -------------------------- | ----------------------------------------- |
| Reproducible install       | `pnpm install --frozen-lockfile`          |
| Root build                 | `pnpm build`                              |
| Root typecheck             | `pnpm check-types`                        |
| Root non-mutating lint     | `pnpm lint:check`                         |
| API non-mutating lint      | `pnpm --filter api lint:check`            |
| Web non-mutating lint      | `pnpm --filter web lint:check`            |
| Web build                  | `pnpm --filter web build`                 |
| Web unit/component         | `pnpm --filter web test`                  |
| Web browser regression     | `pnpm --filter web test:e2e`              |
| API Prisma validation      | `pnpm --filter api prisma:validate`       |
| API Prisma generation      | `pnpm --filter api prisma:generate`       |
| Apply committed migrations | `pnpm --filter api prisma:migrate:deploy` |
| API build                  | `pnpm --filter api build`                 |
| API integration            | `pnpm --filter api test:int`              |
| API E2E                    | `pnpm --filter api test:e2e`              |
| Whitespace gate            | `git diff --check`                        |

The existing `pnpm --filter api lint` script remains the explicit developer
autofix workflow. Release and future CI validation use `lint:check`, which never
rewrites files.

## Efficient validation sequence

Do not repeat every suite after every small change.

1. During a slice: run its targeted unit/integration test, package lint and
   package typecheck only.
2. Before provider configuration: run install, Prisma validation/generation,
   both production builds and non-mutating lint/typecheck.
3. Before first database migration: inspect a sanitized Neon host/database name,
   obtain explicit approval, then run only `prisma:migrate:deploy` and migration
   status verification.
4. After first deployment: health and public read-only smoke first; auth/cart,
   Google OAuth and Stripe sandbox mutations only after those pass.
5. Final gate: web unit/E2E/Axe, selected API integration/E2E, production builds
   and `git diff --check`. Lighthouse is remeasured on hosted representative
   routes and compared with the retained U6 baseline; the existing approved
   performance exception remains explicit unless measurements justify closing
   it.

## Public-demo readiness checklist

### Automated

- [ ] Frozen-lockfile install passes on supported Node/pnpm versions.
- [ ] Web and API production builds pass.
- [ ] Lint and typecheck are non-mutating and green.
- [ ] Prisma schema validates and generated client is current.
- [ ] Required regression suites pass for the deployed revision.
- [ ] Health, security-header and rate-limit tests pass.
- [ ] `git diff --check` passes.

### Hosted smoke

- [ ] Vercel page and static assets load over HTTPS.
- [ ] `/api/*` calls remain same-origin in the browser.
- [ ] Render liveness/readiness respond without sensitive data.
- [ ] Neon connectivity and committed migration status are verified.
- [ ] Anonymous Catalog/PDP and error states work after cold start.
- [ ] Customer session refresh/sign-out and Guest Cart cookie persist correctly.
- [ ] SupplierUser, SupportManager and Admin access boundaries remain enforced.
- [ ] Google callback, explicit linking and Google-only password creation pass.
- [ ] Stripe sandbox paid, duplicate, delayed and expired/cancel paths pass.
- [ ] No session, guest identity, OAuth code or payment metadata appears in
      browser storage, URLs, public caches or provider logs.
- [ ] Manual keyboard, screen-reader, zoom and responsive smoke has no
      critical/high issue.

### Operational

- [ ] Provider owners and recovery access are documented privately.
- [ ] Secret rotation procedure names the owner without containing values.
- [ ] Neon export/restore limitation is accepted for the free demo.
- [ ] Render cold-start limitation is disclosed in project documentation.
- [ ] Vercel and Render rollback steps identify a known-good revision.
- [ ] Demo data is synthetic and recoverable from an approved source.

## Rollback and recovery strategy

1. Stop mutations or temporarily mark the demo unavailable if auth, ownership
   or payment authority is incorrect.
2. Roll Vercel and Render back to the last known-good deployment from their
   provider dashboards.
3. Do not run destructive Prisma commands. Committed migrations are forward
   only; a schema rollback requires a separately reviewed corrective migration.
4. For a failed webhook delivery, fix availability/configuration and use Stripe
   sandbox resend. Never update payment status manually through the browser.
5. If demo data must be rebuilt, create a fresh staging target or use the
   separately approved synthetic bootstrap procedure. Do not restore unknown or
   personal data.

## Known limitations and accepted risks

| Risk                                             | Demo treatment                                             | Status                  |
| ------------------------------------------------ | ---------------------------------------------------------- | ----------------------- |
| Render sleeps after idle                         | Document cold start; retry recoverable UI requests         | Accepted for free demo  |
| Stripe event reaches sleeping API                | Checkout normally warms API; rely on sandbox retry/resend  | Must validate           |
| Neon compute wake-up                             | Bounded readiness and first-request latency measurement    | Accepted if recoverable |
| Free database lacks production backup guarantees | Synthetic reproducible data; no real PII                   | Must document           |
| Provider subdomains only                         | Canonical Vercel origin; no custom-domain promise          | Accepted                |
| API upstream is publicly reachable               | Auth/RBAC retained; scoped rate/security baseline added    | Revalidate when hosted  |
| Provider logs only                               | Runtime redaction audit passed; provider logs need smoke   | Revalidate in PF3/PF7   |
| Lighthouse baseline below original target        | Preserve approved U6 exception and remeasure hosted routes | Conditional             |

## Open questions

These decisions do not block creation of the plan but must be resolved before
their corresponding implementation slice:

1. Has the complete Git history passed a secret audit so the repository may be
   made public before connecting it to providers?
2. Which exact manual, allowlisted implementation will populate Neon with
   synthetic demo data?
3. Do the required free Vercel, Render and Neon accounts already exist?

PF1 resolved the former rate-limit and logging-policy decisions: approved
in-memory limits are `10/5/30` per 60 seconds, and provider-default retention is
accepted for nonsensitive metadata until the hosted PF7 review.

## Required approvals during implementation

Separate explicit approval is required before:

- adding a dependency;
- creating or modifying provider resources;
- setting secrets or OAuth/Stripe registrations;
- connecting to Neon or running migrations;
- running any hosted demo-data bootstrap;
- adding deployment workflows that consume repository/provider secrets;
- changing auth, cookie, payment, database or role policies;
- running full E2E/Lighthouse suites or external service checks.

## Recommended implementation order

1. PF0 configuration contract and non-mutating repository gate.
2. PF1 health/security baseline with targeted tests.
3. PF2 Neon migration and synthetic-data runbook.
4. PF3 Render API deployment.
5. PF4 Vercel web deployment and same-origin smoke.
6. PF5 Google OAuth staging validation.
7. PF6 Stripe sandbox webhook validation.
8. PF7 final automated/hosted validation.
9. PF8 documentation synchronization and release decision.

## References

- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)
- [Vercel monorepos](https://vercel.com/docs/monorepos)
- [Vercel rewrites](https://vercel.com/docs/routing/rewrites)
- [Render free services](https://render.com/docs/free)
- [Render monorepo support](https://render.com/docs/monorepo-support)
- [Render health checks](https://render.com/docs/health-checks)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Better Auth options](https://better-auth.com/docs/reference/options)
- [Stripe webhooks](https://docs.stripe.com/webhooks)
