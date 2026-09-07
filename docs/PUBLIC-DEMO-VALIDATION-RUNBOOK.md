# Public-Demo Validation Runbook

## Scope

This runbook covers the controlled synthetic-data bootstrap, repository quality
gate, read-only hosted smoke and rollback procedure for the public portfolio
demo. It does not authorize live payments, real customer data, automatic
production seeding or production-scale operations.

## PF7A: synthetic Neon bootstrap

The bootstrap reuses the versioned, idempotent local demo dataset but has a
separate entrypoint and authorization guard. It may run only against a direct
Neon host, the explicitly named public-demo database and TLS
`sslmode=require`. It rejects configured `TEST_DATABASE_URL`, non-production
mode and a confirmation value for a different seed version.

The current dataset contains 36 products, 216 variants, 360 Listings, vehicle
taxonomy and fitment coverage, plus synthetic commerce, Supplier and Internal
Ops scenarios. It does not create Better Auth Accounts, Sessions,
Verifications, passwords or OAuth links. Role-aware login accounts remain
private and separately managed by the demo owner; no shared credentials are
published.

### Manual execution

Do not paste a database URL into chat, Git, Markdown, screenshots or shell
history intended for sharing. Set it only in the current local process from the
Neon direct connection field, with `sslmode=require`.

In a fresh PowerShell session, set these process variables:

```powershell
$env:NODE_ENV = 'production'
$env:DATABASE_URL = '<DIRECT_NEON_URL_WITH_SSLMODE_REQUIRE>'
$env:PUBLIC_DEMO_DATABASE_NAME = 'neondb'
$env:PUBLIC_DEMO_BOOTSTRAP_CONFIRMATION = 'APPLY_SYNTHETIC_DEMO_DATA:2026-09-catalog-commerce-v2'
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
```

Then run only this sequence from the repository root:

```powershell
pnpm --filter api prisma:demo:preflight
pnpm --filter api prisma:migrate:status
pnpm --filter api prisma:demo:bootstrap
```

The first two commands must show only the approved sanitized Neon host,
database name, direct connection and current migration status. Stop if either
fails. The bootstrap prints only the seed version and aggregate synthetic
counts; it must never print credentials.

After completion, clear the process variables:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:PUBLIC_DEMO_DATABASE_NAME -ErrorAction SilentlyContinue
Remove-Item Env:PUBLIC_DEMO_BOOTSTRAP_CONFIRMATION -ErrorAction SilentlyContinue
Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
```

Re-running the command updates only the known synthetic records through their
stable IDs/keys. It does not delete user-created records and is not a scheduled
reset. Any future destructive reset requires a separate plan and approval.

## PF7B: GitHub quality gate

`.github/workflows/quality.yml` runs for pull requests and pushes to `main`.
It has read-only repository permissions and no provider secrets.

- `Static, unit and build`: frozen pnpm install, non-mutating lint, typecheck,
  API/Web unit tests and the production builds.
- `API PostgreSQL integration and E2E`: an ephemeral PostgreSQL 16 service,
  Prisma validation/generation and the API integration/e2e suites.

The database job uses only `localhost:5432/auto_parts_test`. Existing guards
reject Neon and other database names. The service and all data disappear with
the GitHub runner.

After the first successful workflow run, configure branch protection for
`main` to require both jobs before merge. Vercel and Render remain responsible
for deploying `main`; GitHub Actions receives no deploy, Neon, Google or Stripe
credentials.

## Read-only hosted smoke

After Vercel and Render deploy the same revision, run:

```bash
pnpm smoke:public-demo
```

The script checks:

- Render `/api/v1/health/live`;
- Render `/api/v1/health/ready`;
- Vercel `/`;
- Vercel `/catalog`.

Every request uses HTTPS GET, a 60-second timeout and at most two retries for a
Render Free cold start. Output contains only the public URL/path, HTTP status,
duration and pass/fail. It does not send credentials, perform mutations or log
response bodies.

Optional non-secret URL overrides are `PUBLIC_DEMO_WEB_URL` and
`PUBLIC_DEMO_API_URL`. Both must use HTTPS.

## Validation evidence

Record the deployed Git revision, public provider URLs, UTC timestamp and
pass/fail only. Do not record environment values, headers, cookies, OAuth data,
Stripe signatures/payloads or database contents.

| Check                                       | Result  | Owner |
| ------------------------------------------- | ------- | ----- |
| PF6 local Stripe integration/e2e suites     | Pass    | User  |
| PF7 seed authorization unit suites          | Pass    | Agent |
| Bootstrap rejects missing confirmation      | Pass    | Agent |
| Synthetic Neon bootstrap                    | Pending | User  |
| GitHub `Static, unit and build` job         | Pending | User  |
| GitHub `API PostgreSQL integration and E2E` | Pending | User  |
| Vercel/Render revision deployed             | Pending | User  |
| Read-only hosted smoke                      | Pass    | Agent |
| Hosted Stripe runbook                       | Pending | User  |
| Manual OAuth/accessibility/responsive smoke | Pending | User  |

Lighthouse is not a blocking GitHub check because free-tier cold starts make it
non-deterministic. The manually measured Performance `75–78` remains the
formally accepted exception until PF8 records newer hosted evidence.

The first hosted smoke observed Render `503` during cold start while Vercel
recovered. One immediate post-warm retry passed all four checks: API liveness
`200` in 527 ms, API readiness `200` in 213 ms, Web home `200` in 425 ms and
Catalog `200` in 473 ms. This is accepted free-tier behavior, not evidence of a
persistent API failure.

## Rollback procedure

A documented rollback is sufficient for this portfolio demo; PF7 does not
perform an outage-producing rehearsal.

1. Stop mutation smoke and identify the last known-good Git revision.
2. In Render, select the last known-good API deployment and redeploy it.
3. In Vercel, promote or redeploy the matching known-good web deployment.
4. Wait for Render readiness, then run `pnpm smoke:public-demo`.
5. If a Stripe test webhook failed during API unavailability, use Stripe
   Dashboard test-mode **Resend** after readiness returns.
6. Never roll the Prisma schema backward, run destructive database commands or
   manually update payment state. A schema correction requires a new reviewed
   forward migration.

PF7 remains `Conditional` until the pending rows are completed. This status
means public-demo foundation, never production readiness for real customers.
