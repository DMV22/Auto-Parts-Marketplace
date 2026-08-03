
# ARCHITECTURE.md

## Purpose

Auto Parts Marketplace is intended to let users discover, list, and manage automotive parts through a web application backed by an API and PostgreSQL database.

Business capabilities are still being defined. Do not invent checkout, payment, shipping, moderation, or compatibility behavior without an accepted requirement.

## Current state

The repository currently contains:

- `apps/web` — Next.js 16 App Router application using React 19.
- `apps/api` — NestJS 11 HTTP API.
- `packages/ui` — shared React UI primitives.
- `packages/eslint-config` — shared ESLint configuration.
- `packages/typescript-config` — shared TypeScript configuration.
- Turborepo orchestration through `turbo.json`.
- pnpm workspaces through `pnpm-workspace.yaml`.

The current applications are starter implementations.

Not implemented yet:

- Prisma;
- PostgreSQL integration;
- domain data model;
- authentication and authorization;
- production API contract;
- frontend-to-API integration;
- media storage;
- payment, shipping, or order workflows;
- production deployment architecture.

## Target system context

```text
Browser
   |
   v
Next.js web application
   |
   | HTTPS / versioned API contract
   v
NestJS API
   |
   | Prisma Client
   v
PostgreSQL
```