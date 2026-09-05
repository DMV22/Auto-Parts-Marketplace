# Public Demo Database Runbook

## Purpose

This runbook prepares the dedicated Neon PostgreSQL database for the public
portfolio demo. It is an operator-driven process, not an application startup or
deployment hook.

The public demo must use synthetic data only. Never use this procedure against
local development, test, shared production, or customer databases.

## Safety contract

- Use a dedicated Neon project and database.
- Use the direct/unpooled Neon TLS URL for migration commands.
- Use the pooled URL later as the Render runtime `DATABASE_URL`.
- Keep connection strings in a trusted process environment only.
- Never paste credentials into Git, Markdown, screenshots, issues, chat, shell
  transcripts, or CI logs.
- Do not configure `TEST_DATABASE_URL` in the operator shell.
- Do not run `prisma migrate dev`, `prisma db push`, `prisma migrate reset`,
  `prisma db seed`, or destructive SQL against Neon.
- Do not use the Vercel generic Neon quickstart: this project does not need a
  frontend Neon driver, a sample table, or a Next.js Server Action.

## Prerequisites

1. The target is a dedicated Free-plan Neon database for this public demo.
2. The operator knows the actual PostgreSQL database name. The Vercel
   integration display name may be different.
3. The direct/unpooled URL contains `sslmode=require`.
4. The repository revision and all committed migrations have been reviewed.
5. The user has explicitly approved the sanitized host/database pair and the
   migration operation.

Only these sanitized details may be recorded as evidence:

```text
Host: <endpoint>.neon.tech
Database: <approved-database-name>
Connection type: direct/unpooled
TLS: required
```

## Safe secret entry in PowerShell

Use a private local terminal. The following reads the direct URL without
placing it in command history or echoing it as plain text:

```powershell
$secureUrl = Read-Host 'Neon direct DATABASE_URL' -AsSecureString
$urlPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
try {
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($urlPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($urlPointer)
}
$env:PUBLIC_DEMO_DATABASE_NAME = '<approved-database-name>'
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
```

Do not print either environment variable.

## Preflight and migration sequence

Run commands from the repository root. Stop immediately if any command fails.

1. Validate the Prisma schema without modifying the database:

   ```powershell
   pnpm --filter api prisma:validate
   ```

2. Generate the Prisma client locally:

   ```powershell
   pnpm --filter api prisma:generate
   ```

3. Inspect the target without opening a database connection:

   ```powershell
   pnpm --filter api prisma:demo:preflight
   ```

   Expected output contains only the approved host, database name, direct
   connection type and TLS mode. Compare it with the Neon console and obtain a
   separate explicit approval before continuing.

4. Apply committed migrations exactly once:

   ```powershell
   pnpm --filter api prisma:migrate:deploy
   ```

5. Verify migration status using the same direct connection:

   ```powershell
   pnpm --filter api prisma:migrate:status
   ```

6. Remove secrets from the current process even after a failed command:

   ```powershell
   Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
   Remove-Item Env:PUBLIC_DEMO_DATABASE_NAME -ErrorAction SilentlyContinue
   ```

Do not include the connection URL in validation evidence. Record only command
status, migration count/status, sanitized target metadata and timestamp.

## Synthetic demo-data bootstrap contract

PF2 does not add or run a hosted seed. The existing `prisma:seed` command is
intentionally guarded for local `auto_parts_dev` and must not be weakened.

A future bootstrap requires a separate implementation plan and approval. It
must be:

- manual, one-time and never part of build/start/deploy;
- allowlisted to the exact Neon host and database name;
- idempotent and safe to resume after interruption;
- limited to synthetic catalog and operational demonstration data;
- unable to create password Accounts, Sessions, OAuth tokens, real addresses,
  Stripe identifiers, webhook payloads or other customer/payment data;
- verified using aggregate counts and stable logical keys only.

The migration and bootstrap approvals are separate operations.

## Backup and recovery expectations

Free public demo does not claim production-grade backup or point-in-time
recovery guarantees.

- Schema recovery source: committed Prisma migrations.
- Synthetic content recovery source: a future reviewed idempotent bootstrap.
- Do not retain database dumps after demo sign-in or checkout activity; they may
  contain Accounts, Sessions, addresses or payment metadata.
- Before any future corrective schema/data operation, review current Neon
  export/restore capabilities and create a separate recovery plan.
- If the demo database becomes untrusted, create a fresh dedicated target,
  reapply committed migrations, rotate credentials and run only an approved
  synthetic bootstrap. Do not use destructive reset commands on the old target.

## PF2 completion evidence

Repository-side PF2 is complete when the preflight unit tests, targeted lint,
API build and `git diff --check` pass. Hosted database acceptance remains
pending until the operator records:

- approved sanitized target;
- successful `prisma:migrate:deploy`;
- successful `prisma:migrate:status`;
- API readiness success against Neon;
- confirmation that no local fixtures or credentials were introduced.
