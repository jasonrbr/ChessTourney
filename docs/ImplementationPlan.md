# ChessTourney Implementation Plan

## Purpose

This document turns the current planning artifacts into a concrete implementation starting point.

It is intentionally opinionated. The goal is to reduce ambiguity enough to begin coding without claiming that every later detail is already final.

## Status

- Active implementation baseline for Milestone 1
- Current starting point for MVP implementation
- In use for the current coding slices

## Current Code State

The repository now contains a runnable Prisma-backed test-run slice for a Blitz Double Round Swiss event. It intentionally skips user/auth setup for now so the tournament workflow can be tested quickly.

Implemented in the current codebase:

- local PostgreSQL setup with Docker Compose
- Prisma schema and seed data for a Michigan-based sample event
- public tournament listing, event detail, and guest registration
- TD tournament workspace for creating, editing, publishing, and running tournaments
- configurable tournament visibility/status, bye score defaults, multiple sections, and section eligibility
- TD registration review for unrated players in sections configured for TD review
- Double Round Swiss pairing generation per section
- requested byes, odd-player pairing byes, combined two-game result entry, and standings
- focused unit tests for scoring, standings, and pairing logic

Still not implemented:

- organization accounts, auth, sessions, MFA, and role permissions
- hosted deployment
- payment state and hosted checkout
- printing, export, reporting/submission, and local backup files
- prize configuration and prize award calculation
- PWA offline packet, local command queue, and sync/review flow

## Recommended Stack

### Application Shape

- single TypeScript monorepo-style web application
- SvelteKit for the public site and organization-side UI
- server-side request handling through SvelteKit server routes, load functions, and form actions where appropriate

Why:

- keeps public and staff workflows in one codebase
- supports server-rendered public pages and authenticated operational screens cleanly
- avoids the coordination cost of splitting frontend and backend too early

### Frontend

- Svelte with SvelteKit
- TypeScript throughout
- accessible component patterns from the start
- PWA-capable application shell for offline event operations

Recommended stance:

- prefer server-rendered pages for public discovery/detail views
- use client-side interactivity only where it materially improves operational workflows
- design event-operations screens so they can later read/write from local PWA storage when a tournament has been prepared for offline use

### Backend

- SvelteKit server routes and form actions for HTTP endpoints and workflow submissions
- application services/modules for domain logic instead of putting business rules directly in routes

Recommended stance:

- keep transport concerns thin
- centralize registration, tournament, authz, and audit logic in internal service layers

### Database

- PostgreSQL as the primary database

Why:

- strong fit for relational operational data
- good support for transactions, constraints, audit-friendly records, and reporting-oriented queries
- aligns well with multi-tenant business data and explicit state modeling

### ORM And Migrations

- Prisma ORM
- Prisma Migrate for schema evolution

Why:

- type-safe database access
- fast setup for a TypeScript-first project
- pragmatic balance between developer speed and relational structure for the MVP

### Authentication And MFA

- Better Auth with email/password enabled
- Better Auth two-factor plugin for TOTP and backup-code support

Why:

- matches the confirmed MVP requirement for organization-side MFA
- supports email/password and TOTP in the same implementation path
- keeps auth inside the application boundary instead of introducing a heavier external identity dependency immediately

Recommended stance:

- in the first coding slice, Better Auth can be used only for basic organization-side sign-in/session handling
- MFA can be deferred until the first auth hardening slice if that helps start faster
- player accounts remain optional and can start with lighter auth requirements than org-side access

### Payments

- defer Stripe from the first implementation slice
- preserve an internal payment boundary and a separate payment-state model so hosted payments can be added later

Why:

- removes immediate integration and cost uncertainty
- lets tournament-management workflows ship earlier
- keeps the project aligned with the confirmed separation between registration state and payment state

### Email / Notifications

- defer Resend from the first implementation slice
- keep a notification boundary so email can be introduced later without rewriting calling code

Why:

- avoids early provider setup while the team is still proving core workflows
- reduces moving parts for the first milestone

### Background Jobs

- no dedicated job framework in the first implementation slice

Recommended stance:

- keep the first slice synchronous where practical
- isolate side-effect triggers behind internal interfaces so a durable job runner can be added later without refactoring business rules
- revisit a job framework when reporting generation, bulk notifications, or long-running reconciliation actually require it

### Export And File Generation

- generate exports on the server in TypeScript
- start with straightforward file builders for CSV/TXT/TRF-style artifacts

Recommended stance:

- keep export generation inside the reporting module
- track export metadata in application records even if the file-generation approach stays simple at first
- make results/standings exports for day-of-event operations capable of being generated from downloaded local tournament data

### Prize Configuration And Award Calculation

- model prize categories per section, not only at tournament level
- support overall/place prizes, closed rating-class prizes, under-rating prizes, unrated prizes, special/additive prizes, and non-cash awards
- support cash, non-cash, and combined cash-plus-non-cash award descriptions
- support both guaranteed/simple and based-on prize funds in MVP
- store the rating basis used for prize eligibility as a snapshot or explicit event policy
- distinguish cash prize calculation from non-cash award assignment
- make calculated prize winners reviewable and overrideable by the TD before publication or payout

Recommended stance:

- implement prize configuration after standings and tie-break data are reliable
- calculate awards from final standings using US Chess defaults for cash-prize pooling and one-prize-per-player behavior
- apply normal cash-prize pooling and one-prize behavior to overlapping under categories; stack only special/additive categories
- support explicit special/additive prize categories only when the TD marks them as such in advance
- allow special/additive prizes to stack with normal place/class/under prizes
- use tie-breaks as the default non-cash award resolver, show the TD how the tie-break result was determined, and allow TD override
- calculate combined cash-plus-non-cash awards separately by default, with a TD-configurable same-recipient variation when announced
- avoid letting a player choose which prize to accept; the system should calculate the award according to configured ranking and US Chess rules
- record prize-calculation inputs and TD overrides for auditability

### Offline Event Operations

- use PWA capabilities for day-of-event offline resilience
- keep registration, payments, notifications, account management, and federation submission online-first
- support offline operation only after an authorized user prepares a tournament packet while online
- store downloaded event-operation data in IndexedDB and app assets through Cache Storage/service worker behavior
- model offline changes as auditable commands queued for later sync

Recommended stance:

- do not make Milestone 1 fully offline-capable
- preserve the architecture now by implementing event operations through command handlers and services rather than server-route-only mutations
- start with a conservative single-active-offline-device assumption for MVP
- require sync validation and review for risky offline actions such as walk-ins, eligibility overrides, and late section changes

## Deferral Guidance For External Services

To start faster, these services can be phased in rather than adopted all at once.

### Better Auth

Recommended first use:

- org-side sign-in
- session handling
- protected organization pages

Can be deferred slightly within the auth area:

- TOTP enrollment UX
- recovery-code UX
- optional player-account flows

### Stripe

Recommended deferral:

- do not build hosted checkout in milestone one
- do not make tournament-management screens depend on payment collection

Design requirement while deferred:

- keep `PaymentRecord` as a separate concept
- use nullable or placeholder payment configuration fields on tournaments as needed
- do not mix payment outcomes into registration-state transitions

### Resend

Recommended deferral:

- do not require live email delivery in milestone one

Design requirement while deferred:

- keep notification calls behind an internal interface
- allow no-op or log-only notification behavior during early development

## Recommended Answers To The Remaining Architecture Questions

These are the default decisions I recommend adopting so implementation can begin.

### 1. `CheckInRecord`

Recommendation:

- model `CheckInRecord` as a standalone entity

Why:

- check-in is optional per event
- it benefits from clear actor/timestamp auditability
- it avoids overloading `Registration` with operational metadata that is only relevant when check-in is enabled

### 2. Pairing Target Model

Recommendation:

- do not point `Pairing` directly at `Registration` only
- introduce a lightweight competitor abstraction from the start

Recommended shape:

- `Pairing`
- `PairingSide` or equivalent
- each side references either a registration-based competitor or a team-based competitor

Why:

- MVP includes both individual and team events
- this prevents the individual-pairing model from forcing a rewrite once team pairing arrives
- it keeps the shared pairing lifecycle intact while allowing different competitor types

Implementation note:

- this should be a lightweight abstraction, not a deep inheritance model

### 3. Team-Event Pairing Model

Recommendation:

- use one shared pairing model in MVP
- handle team-event differences through competitor typing and rules, not a separate pairing table

Why:

- preserves one operational workflow for generation, review, posting, and result entry
- avoids duplicating pairing lifecycle logic
- keeps future specialization possible if real complexity proves it necessary

### 4. Default `org_admin` Operational Scope

Recommendation:

- keep `org_admin` admin-only by default
- grant tournament-operation powers by also assigning `chief_td` or `staff` where needed

Why:

- best match for least privilege
- cleaner separation between organization administration and tournament operations
- avoids quietly giving every admin day-of-event authority

### 5. Tournament Assignment In MVP

Recommendation:

- defer dedicated tournament-assignment records in the first slice
- use organization-scoped roles first

Why:

- faster initial implementation
- sufficient for the first milestone and likely the early MVP
- the authorization model already leaves room for tournament scoping later

Implementation note:

- authorization services should be written so tournament-specific assignment can be added without changing every call site

### 6. Offline Operations Boundary

Recommendation:

- support offline behavior for tournament operations only, not the entire product
- registration, payments, notifications, account management, and federation submission remain online-first
- event-operation commands should be capable of running against hosted persistence now and local PWA storage later

Why:

- over-the-board tournament operations must survive venue connectivity problems
- registration and payment workflows naturally depend on hosted services
- keeping the offline boundary narrow makes the MVP achievable without sacrificing day-of-event reliability

## Recommended First Coding Milestone

### Milestone Name

- Foundation, Organization Access, And Tournament Management Screens

### Scope

- application skeleton and deployment-ready local development setup
- PostgreSQL and Prisma baseline
- Better Auth integration for basic organization-side sign-in and sessions
- organization, user, and organization membership models
- role and permission bundle mapping for `org_admin`, `chief_td`, and `staff`
- tournament, affiliate, and section core models
- draft tournament creation and editing
- rated-event affiliate enforcement
- organization-side screens to create, view, and edit tournaments and sections
- tournament publication flow
- public tournament discovery list and tournament detail page
- preserve PWA/offline-readiness boundaries for future event operations

### Explicitly Deferred From This Milestone

- player self-service registration
- MFA enrollment and recovery-code management UX if needed to start faster
- online payment flow
- payment processor integration
- walk-in registration
- staff check-in
- pairing generation and result entry
- reporting/export generation
- team creation and acceptance
- live email/notification delivery
- offline tournament packet download, local command queue, and sync/review workflows

### Acceptance Criteria

- an organization-side user can sign in and access org-scoped protected pages
- an org membership resolves to the expected permission bundle
- an authorized user can create a draft tournament with sections
- a rated tournament cannot be published without exactly one affiliate
- a tournament can transition from draft to published with an auditable event
- an authorized user can manage tournament configuration through working screens rather than seed data only
- published tournaments appear on the public side
- draft tournaments and unpublished operational data remain hidden publicly
- tournament-management code does not make event-operation workflows depend on server-route-only mutations

## Current Progress Note

Implementation has started on this milestone.

Completed in the current codebase:

- SvelteKit scaffold and project tooling baseline
- top-level application shell
- local PostgreSQL and Prisma baseline
- public and TD tournament routes backed by Prisma
- tournament create/edit/run screens
- section eligibility configuration and enforcement for registration/walk-ins
- Double Round Swiss pairings, byes, result entry, and standings for the current test-run format
- unit tests for pairing, scoring, and standings domain logic

Recommended next implementation target:

- add organization/auth/MFA foundations, or
- continue the tournament test-run slice with exports/local backup and audit history before hosting a real trial event

Offline planning note:

- before making check-in, pairings, results, printing, or exports offline-capable, review `OfflineOperationsPlan.md` and keep those workflows command-oriented so they can run from local PWA data during an internet outage

## Recommended Milestone After That

- Registration Intake And Payment State

Scope preview:

- player lookup flow
- section eligibility enforcement
- guest registration
- separate `Registration` and `PaymentRecord` handling
- pay-onsite and unpaid/offline handling first if desired
- hosted checkout integration after the base payment-state model is validated
- registration confirmation and cancellation flows

## Prize Configuration Milestone

This milestone should happen after standings and tie-break calculations exist for the relevant tournament format.

Scope preview:

- section-level prize category setup
- prize category types: place, class/rating range, under rating, unrated, special/additive, and non-cash
- prize amount/award configuration for cash, non-cash, and combined cash-plus-non-cash awards
- prize rank/order configuration for non-cash and overlapping eligible awards
- based-on prize fund configuration and proportional payout calculation
- cash-prize pooling calculation for tied players with different eligibility
- tie-break explanation display for non-cash prize assignments
- prize eligibility preview from current standings
- final prize calculation with TD review before publish/payout
- audit trail for TD prize overrides

Initial data-shape recommendation:

- `PrizeCategory` belongs to `Section`
- `PrizeCategory` stores category type, public label, eligibility criteria, rank/order, cash amount, non-cash award description, based-on settings, and whether it is additive/special
- `PrizeAward` stores the calculated recipient, amount/award, tied group context, calculation status, and optional TD override note
- prize eligibility should use event-specific rating snapshots, not live post-event ratings

Prize policy note:

- no open prize-policy questions remain from the initial prize planning pass; future implementation questions should be handled as UI/data-shape details unless they change US Chess default behavior

## Offline-Readiness Milestone

This milestone should happen before or alongside the first event-operations implementation.

Scope preview:

- PWA manifest and service worker baseline
- installable app shell for organization-side operations
- offline status indicator
- local tournament packet storage model in IndexedDB
- command queue abstraction for event-operation actions
- local backup/export file shape
- sync/review design for queued offline commands

This milestone does not need to make registration or payment flows offline-capable.

## Implementation Structure Recommendation

The first codebase pass should be organized around application areas, not frameworks alone.

Suggested top-level internal modules:

- identity-access
- organizations
- tournaments
- offline-operations
- prizes
- public-web
- audit
- notifications
- payments
- reporting

This is a logical structure recommendation, not a strict folder prescription.

## Risks To Watch Early

- letting route handlers become the business-logic layer
- mixing registration state and payment state
- leaking role-name checks throughout the codebase instead of centralizing permissions
- treating team events as an afterthought in pairing design
- implementing pairings/results as server-only mutations that cannot later run from local PWA storage
- calculating prizes before standings, tie-breaks, rating snapshots, and withdrawal/completion rules are stable
- overbuilding background-job infrastructure before the first slice proves the need

## Decision Summary

Recommended defaults before coding:

- SvelteKit plus TypeScript
- PostgreSQL plus Prisma
- Better Auth for org-side auth, with MFA hardening available but deferrable
- Stripe deferred from milestone one, but payment boundaries preserved
- Resend deferred from milestone one, but notification boundaries preserved
- no dedicated job runner in milestone one
- PWA-based offline support is scoped to day-of-event operations
- prize categories are section-scoped and should follow US Chess cash/non-cash prize defaults unless the TD explicitly configures announced variations
- standalone `CheckInRecord`
- shared pairing lifecycle with a lightweight competitor abstraction
- admin-only default for `org_admin`
- tournament assignment deferred from the first slice
