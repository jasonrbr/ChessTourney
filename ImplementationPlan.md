# ChessTourney Implementation Plan

## Purpose

This document turns the current planning artifacts into a concrete implementation starting point.

It is intentionally opinionated. The goal is to reduce ambiguity enough to begin coding without claiming that every later detail is already final.

## Status

- Active implementation baseline for Milestone 1
- Current starting point for MVP implementation
- In use for the first coding slice

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

Recommended stance:

- prefer server-rendered pages for public discovery/detail views
- use client-side interactivity only where it materially improves operational workflows

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

### Acceptance Criteria

- an organization-side user can sign in and access org-scoped protected pages
- an org membership resolves to the expected permission bundle
- an authorized user can create a draft tournament with sections
- a rated tournament cannot be published without exactly one affiliate
- a tournament can transition from draft to published with an auditable event
- an authorized user can manage tournament configuration through working screens rather than seed data only
- published tournaments appear on the public side
- draft tournaments and unpublished operational data remain hidden publicly

## Current Progress Note

Implementation has started on this milestone.

Completed in the current codebase:

- SvelteKit scaffold and project tooling baseline
- top-level application shell
- organization-side route structure for tournament management
- first-pass tournament list, create, and detail/edit screens using typed mock data

Next implementation target:

- add Prisma and the initial relational schema
- replace mock tournament loaders with real persistence

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

## Implementation Structure Recommendation

The first codebase pass should be organized around application areas, not frameworks alone.

Suggested top-level internal modules:

- identity-access
- organizations
- tournaments
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
- overbuilding background-job infrastructure before the first slice proves the need

## Decision Summary

Recommended defaults before coding:

- SvelteKit plus TypeScript
- PostgreSQL plus Prisma
- Better Auth for org-side auth, with MFA hardening available but deferrable
- Stripe deferred from milestone one, but payment boundaries preserved
- Resend deferred from milestone one, but notification boundaries preserved
- no dedicated job runner in milestone one
- standalone `CheckInRecord`
- shared pairing lifecycle with a lightweight competitor abstraction
- admin-only default for `org_admin`
- tournament assignment deferred from the first slice
