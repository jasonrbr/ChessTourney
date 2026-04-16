# ChessTourney Architecture Overview

## Purpose

This document captures the initial high-level architecture for the planning phase.

It is intentionally technology-agnostic where the project has not yet approved a concrete stack.
It should be used to review boundaries, responsibilities, and sequencing before implementation begins.

## Architecture Status

- Planning phase artifact
- Initial draft based on confirmed discovery decisions
- Not a final implementation design
- Subject to review before coding begins

## System Context

ChessTourney is a public web application used by three broad audiences:

- public users and players discovering tournaments, registering, and viewing posted results
- organization-side users managing clubs, tournaments, registration operations, pairings, results, and reporting
- external services or institutions involved in payments, authentication support, notifications, and rating/reporting workflows

At a system level, ChessTourney sits between tournament participants and tournament staff while coordinating with outside platforms where needed.

## Primary Architectural Goals

- support multiple organizations from the start without fragmenting the public experience
- keep tournament operations reliable even when external integrations are limited or partially manual
- separate public-facing workflows from staff-only operational workflows
- model permissions and auditability as first-class concerns
- isolate federation- and vendor-specific logic behind clear boundaries
- support incremental delivery without forcing a rewrite when reporting, payments, or identity workflows evolve

## High-Level Application Shape

The system should be organized into a small number of clear application areas.

### 1. Public Experience

Responsibilities:

- public tournament discovery
- tournament detail pages
- section visibility and eligibility explanation
- player registration
- player cancellation
- public viewing of posted pairings, rosters, and results
- optional player account entry points

Key constraint:

Public flows should remain simple even though the underlying system supports organizations, staff roles, and federation-specific requirements.

### 2. Organization Administration

Responsibilities:

- organization management
- affiliate association where required
- staff membership within organizations
- role assignment
- MFA enforcement for organization-side users
- audit review for sensitive actions

Key constraint:

This area should be designed around least privilege and extensible permissions rather than hard-coded role assumptions.

### 3. Tournament Setup And Configuration

Responsibilities:

- tournament creation and editing
- visibility settings
- section setup
- rating context and affiliate rules
- section eligibility configuration
- payment/check-in configuration
- event publication lifecycle

Key constraint:

Tournament configuration should capture policy cleanly enough that registration and operations flows can enforce it without hidden business logic.

### 4. Registration And Intake

Responsibilities:

- player lookup and identity matching
- USCF ID validation requirements for rated events
- membership-expiration warning flow
- payment selection and status tracking
- walk-in registration
- registration state management
- TD review flags when eligibility changes after registration

Key constraint:

Registration state and payment state should remain separate so operational edge cases do not corrupt registration logic.

### 5. Event Operations

Responsibilities:

- staff-managed check-in
- pairing generation
- pairing review and posting
- Chief TD pairing edits
- result entry and correction history
- bye and withdrawal handling
- printable pairing sheets
- tie-break visibility for TDs
- extra rated games tracking

Key constraint:

This area contains the highest business-rule complexity and should be backed by explicit state transitions and auditability.

### 6. Reporting And Submission Support

Responsibilities:

- reporting readiness checks
- export generation
- assisted manual submission workflows
- federation-specific reporting boundaries for USCF and FIDE contexts

Key constraint:

Direct machine integrations must not be assumed. Reporting support should work even if submission remains manual or semi-manual.

## Core Domain Areas

The following domain areas appear central to the system design:

- Organization
- OrganizationMembership
- User
- Role / Permission
- Affiliate
- Tournament
- Section
- Registration
- PaymentRecord
- CheckInStatus
- Team
- TeamMembership
- Round
- Pairing
- Result
- ByeOrWithdrawalAction
- ExtraRatedGame
- AuditEvent
- NotificationRecord
- ReportingPackage / ExportArtifact

These names are provisional and should be refined when the ERD/domain model artifact is created.

## Boundary Decisions

### Multi-Organization Boundary

Organizations should be isolated in administration and permissions while sharing a unified public-facing product surface.

Implication:

Most operational data should belong to an organization, but public discovery should not force users to understand that tenancy model unless it helps them.

### Permissions Boundary

Permission checks should be centralized in a dedicated authorization layer or policy model.

Implication:

The system should not rely on scattered role-name checks inside unrelated business logic.

### Integration Boundary

USCF, FIDE, payments, notifications, and authentication-support services should be modeled behind adapters or service interfaces.

Implication:

The rest of the application should depend on internal interfaces and domain events rather than vendor-specific request formats.

### Publication Boundary

Operational data may exist before it is visible publicly.

Implication:

Draft versus posted state should be explicit for tournaments, pairings, and possibly other public outputs.

## External Integration Stance

### USCF

Confirmed public documentation supports affiliate- and TD-governed reporting expectations, but public APIs for automated member lookup or direct submission were not verified.

Architecture stance:

- support assisted/manual-first workflows
- isolate any future lookup or reporting connector behind an adapter
- avoid making core workflows depend on a live USCF integration

### FIDE

Confirmed public guidance centers on TRF production and federation/rating-officer submission paths rather than open direct submission APIs.

Architecture stance:

- support export-first reporting workflows
- keep FIDE support additive to the USCF-first MVP path
- do not assume direct self-service submission from the application

### Payments

Hosted checkout is the preferred MVP approach.

Architecture stance:

- keep payment state outside registration-state transitions
- model reconciliation, late payment, and pay-onsite scenarios explicitly

### Notifications

Email notifications are opt-in.

Architecture stance:

- use a notification service boundary
- avoid burying email side effects directly inside core domain logic

### Authentication And MFA

Organization-side users require MFA in MVP, with email/password plus TOTP and recovery codes.

Architecture stance:

- keep auth and MFA flows separate from tournament business logic
- ensure the admin/staff surface can enforce stronger authentication requirements than public/player flows

## Recommended Internal Module Shape

A reasonable initial module split is:

- public web
- organization admin
- tournament configuration
- registration and intake
- event operations
- reporting and exports
- identity and access
- payments
- notifications
- audit and compliance

This is a logical architecture recommendation, not yet a directory structure decision.

## Data And Workflow Principles

- keep registration status separate from payment status
- model public visibility explicitly rather than inferring it from existence
- model operational corrections as events or auditable changes, not silent overwrites
- preserve enough history to explain pairing/result corrections later
- treat federation-specific fields as bounded concerns rather than spreading them across unrelated modules
- allow tournament operations to continue even when reporting validation is incomplete

## Key Risks For The Architecture Review

- pairing logic may pressure the domain model early
- optional player accounts may create tricky identity-linking paths
- team-event support may require additional roster and invitation states
- printable operational outputs may need their own presentation rules rather than simple screen reuse
- unclear draft/posted/finalized states could create public-data leakage or staff confusion

## Recommended Next Architecture Artifacts

1. Core domain model / ERD
2. Role and permission model
3. Workflow diagrams for registration and event operations
4. Integration boundary diagram
5. Low-fidelity UI flows for public registration and staff desk workflows

## Open Items For Review

- specific technology stack remains unapproved
- exact pairing engine approach remains undecided
- exact player lookup and membership-verification strategy remains undecided
- exact persistence and background-job patterns remain undecided
- exact deployment topology remains undecided

These should be resolved during architecture review or early implementation planning, depending on their impact on the first coding milestone.
