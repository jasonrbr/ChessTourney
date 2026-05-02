# ChessTourney

ChessTourney is a web application for managing over-the-board chess tournaments, with an MVP focused on US Chess / USCF workflows and support for events that may also be FIDE rated.

This repository now contains both the planning artifacts and the first implementation slice.

## Current Status

- Planning and architecture artifacts are drafted and committed
- Milestone 1 implementation is in progress
- Current UI work supports a test-run Double Round Swiss blitz tournament flow
- Payments, email delivery, authentication, and federation submission are intentionally deferred from the first slice
- PWA-based offline support is planned for day-of-event tournament operations, not for registration or payments

## Current Stack

- `SvelteKit`
- `TypeScript`
- `PostgreSQL`
- `Prisma`

The current implementation baseline is documented in `docs/ImplementationPlan.md`.

## Milestone 1 Scope

The current milestone is:

- `Foundation, Organization Access, And Tournament Management Screens`

Current implementation goals:

- establish the SvelteKit application shell
- build organization-side tournament list/create/detail/run flows
- support public tournament listing and registration
- support Double Round Swiss pairings and combined two-game score entry
- preserve the future boundaries for publication, registration, and payments
- preserve the future boundary for offline event operations
- use Prisma-backed tournament data

## Development

Install dependencies:

```sh
npm install
```

Create local env:

```sh
cp .env.example .env
```

Start Postgres:

```sh
docker compose up -d
```

Create/update the database schema:

```sh
npm run db:push
```

Seed a sample Double Round Swiss blitz event:

```sh
npm run db:seed
```

The seed script is repeatable. It replaces only the seeded `friday-night-blitz` event and seeded players using the `@seed.chesstourney.local` email domain.

Start the dev server:

```sh
npm run dev
```

Useful routes:

- `/tournaments`: public tournament listing
- `/tournaments/friday-night-blitz`: public event page
- `/tournaments/friday-night-blitz/register`: public registration
- `/org/tournaments`: TD workspace
- `/org/tournaments/friday-night-blitz`: mobile-friendly TD runner

Run project checks:

```sh
npm run test
npm run check
npm run build
```

## Repository Guides

- `docs/ProjectPlan.md`: source of truth for scope, requirements, and phase status
- `docs/ImplementationPlan.md`: approved implementation baseline and milestone sequencing
- `docs/OfflineOperationsPlan.md`: PWA/offline boundary for day-of-event tournament operations
- `docs/ReadyToCodeChecklist.md`: remaining planning closeout items and implementation readiness notes
- `docs/ExecutionWorkflow.md`: expectations for implementation sessions and documentation updates
- `docs/SessionStart.md`: session startup context for future planning and implementation work
- `docs/diagrams/`: Mermaid planning artifacts and workflow diagrams
