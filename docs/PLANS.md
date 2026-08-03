# PLANS.md

Use an execution plan for work that is complex, ambiguous, risky, spans multiple packages, changes architecture or persistence, or is expected to take multiple sessions.

Small, well-scoped changes do not need a formal plan.

AI coding assistants must use or update an execution plan for work that meets these criteria, rather than implementing directly from a chat.

## Plan requirements

An execution plan must be:

- self-contained enough for another contributor to continue;
- based on inspected repository facts rather than assumptions;
- organized into independently verifiable milestones;
- explicit about affected boundaries, migrations, risks, and validation;
- maintained as a living document while work is in progress.

Do not begin implementation while a product or architectural question would materially change the solution. Record the question and obtain a decision first.

## Status values

Use:

- `[ ]` not started
- `[~]` in progress
- `[x]` complete
- `[!]` blocked

Update the plan as work progresses. Do not mark an item complete until its result has been verified.

---

# Execution plan: <short outcome-oriented title>

## Summary

Describe the user-visible or operational outcome in a few sentences.

## Goal

State what will be true after this plan is completed.

## Non-goals

List related work intentionally excluded from the plan.

## Context inspected

List the relevant files, packages, tests, documentation, errors, and external requirements that were inspected.

Examples:

- `apps/web/...`
- `apps/api/...`
- `packages/...`
- `ARCHITECTURE.md`
- accepted product requirement or issue

## Current behavior

Describe what the repository does now. Include a minimal reproduction for a bug when applicable.

## Desired behavior

Describe the observable result and acceptance criteria.

## Constraints

Record relevant constraints, including:

- package and application boundaries;
- security and privacy requirements;
- compatibility requirements;
- database migration rules;
- performance expectations;
- explicit user decisions.

## Open questions

List unresolved questions that could change the implementation.

If none remain, write:

`None.`

## Proposed approach

Explain the design, data flow, and affected boundaries. Name new abstractions or modules only when needed.

For a cross-stack feature, show the expected flow:

```text
User action
  -> Next.js UI
  -> API request
  -> NestJS controller/validation
  -> business service
  -> Prisma/PostgreSQL
  -> response
  -> updated UI
```
