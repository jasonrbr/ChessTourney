# ChessTourney

ChessTourney is a web application for managing over-the-board chess tournaments, with an MVP focused on US Chess / USCF workflows and support for events that may also be FIDE rated.

This repository now contains both the planning artifacts and the first implementation slice.

## Current Status

- Planning and architecture artifacts are drafted and committed
- Milestone 1 implementation is in progress
- Current UI work focuses on organization-side tournament management screens
- Payments, email delivery, registration, and pairing logic are intentionally deferred from the first slice
- PWA-based offline support is planned for day-of-event tournament operations, not for registration or payments

## Current Stack

- `SvelteKit`
- `TypeScript`
- `PostgreSQL` planned
- `Prisma` planned for data access and migrations

The current implementation baseline is documented in `docs/ImplementationPlan.md`.

## Milestone 1 Scope

The current milestone is:

- `Foundation, Organization Access, And Tournament Management Screens`

Current implementation goals:

- establish the SvelteKit application shell
- build organization-side tournament list/create/detail flows
- preserve the future boundaries for publication, registration, and payments
- preserve the future boundary for offline event operations
- replace mock data with Prisma-backed data in the next implementation step

## Development

Install dependencies:

```sh
npm install
```

Start the dev server:

```sh
npm run dev
```

Run project checks:

```sh
npm run check
```

## Repository Guides

- `docs/ProjectPlan.md`: source of truth for scope, requirements, and phase status
- `docs/ImplementationPlan.md`: approved implementation baseline and milestone sequencing
- `docs/OfflineOperationsPlan.md`: PWA/offline boundary for day-of-event tournament operations
- `docs/ReadyToCodeChecklist.md`: remaining planning closeout items and implementation readiness notes
- `docs/ExecutionWorkflow.md`: expectations for implementation sessions and documentation updates
- `docs/SessionStart.md`: session startup context for future planning and implementation work
- `docs/diagrams/`: Mermaid planning artifacts and workflow diagrams
