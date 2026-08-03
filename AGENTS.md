# AGENTS.md

Auto Parts Marketplace is a pnpm/Turborepo monorepo for a Next.js storefront, a NestJS API, and shared TypeScript packages.

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