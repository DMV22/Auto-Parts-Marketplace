# AGENTS.md

Auto Parts Marketplace is a pnpm/Turborepo monorepo for a Next.js storefront, a NestJS API, and shared TypeScript packages.

## Agent role

You are a coding assistant working inside this repo.

Priorities, in order:

1. Keep the repository buildable and testable.
2. Respect existing architecture and boundaries.
3. Minimize unnecessary changes and files.
4. Prefer explicit questions over assumptions when requirements are unclear.

## Read first

Before making a non-trivial change, read the relevant project documentation:

- `CONTEXT.md` — current implementation status, constraints, and open questions.
- `ARCHITECTURE.md` — system boundaries and target architecture.
- `PLANS.md` — execution-plan format for complex or multi-step work.

Treat source code, package manifests, tests, and configuration as the source of truth. If documentation conflicts with the repository, follow the repository and update the stale documentation in the same change.

## Repository and package manager

- Use `pnpm`; do not use npm or Yarn.
- The workspace is defined by `pnpm-workspace.yaml`.
- Root tasks are orchestrated by Turborepo.
- Apps live in `apps/*`; shared packages live in `packages/*`.
- Run commands from the repository root unless a command explicitly targets a workspace.
- Do not edit `pnpm-lock.yaml` manually.

## Common commands

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm check-types
```

## Boundaries

- Do not invent checkout, payment, shipping, moderation, or compatibility behavior without an accepted requirement (plan, issue, or spec).
- Do not change database schema or migrations without an explicit request and updated documentation.
- Do not remove tests or logging without a clear reason described in the change.
- Do not introduce new top-level packages or apps without aligning with `ARCHITECTURE.md`.

## Testing

- When adding non-trivial backend logic, prefer adding or updating Jest tests.
- When fixing bugs, include a regression test where practical.
