
# CONTEXT.md

## Product

Auto Parts Marketplace is an early-stage marketplace for automotive parts.

The intended technical direction is:

- Next.js frontend;
- NestJS backend;
- Prisma ORM;
- PostgreSQL database;
- pnpm/Turborepo monorepo.

Product requirements and domain workflows are not yet fully represented in the repository.

## Current repository baseline

At the time of this baseline:

- package manager: pnpm 9;
- workspace orchestration: Turborepo 2;
- minimum root Node.js engine: `>=18`;
- frontend: Next.js 16 and React 19;
- backend: NestJS 11;
- language: TypeScript;
- backend tests: Jest and Supertest;
- frontend tests: not configured;
- database integration: not configured;
- Prisma: not installed;
- authentication: not implemented;
- CI/CD: not present in the inspected baseline.

Re-check manifests and source before relying on this list. Update it whenever the baseline changes.

## Repository map

```text
apps/
  web/                  Next.js App Router application
  api/                  NestJS API

packages/
  ui/                   Shared React UI primitives
  eslint-config/        Shared ESLint rules
  typescript-config/    Shared TypeScript configurations

package.json            Root scripts and workspace metadata
pnpm-workspace.yaml     Workspace globs
turbo.json              Task graph and caching
pnpm-lock.yaml          Dependency lockfile
```