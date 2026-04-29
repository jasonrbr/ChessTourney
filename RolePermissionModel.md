# ChessTourney Role And Permission Model

## Purpose

This document defines the initial role and permission model for planning.

It is not a final schema or implementation spec. Its goal is to make role boundaries, permission groupings, and authorization scope explicit before coding begins.

## Status

- Planning phase artifact
- Initial draft aligned to `ProjectPlan.md`, `ArchitectureOverview.md`, `DomainModel.md`, and `DecisionLog.md`
- Subject to review before implementation

## Design Goals

- enforce least privilege for organization-side users
- keep permissions extensible beyond the initial MVP roles
- centralize authorization rules instead of scattering role-name checks
- distinguish organization administration from tournament operations
- support multi-organization membership for a single user
- preserve auditability for sensitive actions
- keep public/player flows simple without granting staff-like access

## Core Authorization Principles

### Org-Scoped Access

Organization-side access is always evaluated in an organization context.

Implications:

- a user may have access in one organization and none in another
- a user's role in one organization does not imply the same role elsewhere
- tournament permissions derive from the owning organization plus any tournament assignment rules

### Role Plus Permission Model

MVP should use named roles for clarity, but the underlying model should be permission-based.

Implications:

- initial roles can be `org_admin`, `chief_td`, and `staff`
- roles should map to permission bundles
- future custom roles or granular overrides can be added without rewriting business logic

### Scope-Aware Permissions

Not every permission applies at the same level.

Recommended scopes:

- organization scope
- tournament scope
- section or round scope where operational workflows need narrower control later

### Stronger Controls For Sensitive Actions

The most sensitive actions should require both the correct permission and an MFA-satisfied organization session.

Sensitive actions include:

- assigning or changing org-side roles
- creating or changing affiliate associations
- publishing tournaments
- overriding section eligibility
- editing pairings
- correcting results
- preparing final reporting/submission artifacts

### Audit-First Authorization

Authorization should integrate with audit logging for sensitive workflows.

At minimum, the system should retain who performed:

- role changes
- tournament publication changes
- eligibility overrides
- pairing edits
- result corrections
- reporting validation overrides if any are allowed later

## Actor Types

These are product actors, not all of which need identical authorization treatment.

### Public User

An unauthenticated visitor.

Can:

- browse public tournaments
- view public tournament detail pages
- view posted public rosters, pairings, and results
- begin registration flows allowed to guests

Cannot:

- access organization administration
- access staff operations
- view draft or non-public operational data

### Player

A tournament participant, with or without an account.

Can:

- register for eligible sections
- cancel their own registration
- manage team invitations or departure when applicable
- view public tournament information
- later use an optional account for history and autofill

Cannot in MVP:

- report results
- check themselves in
- manage tournament operations

Design note:

Player capabilities should generally be tied to ownership of a registration or player-linked identity rather than org-side roles.

### Organization-Side User

An authenticated user acting through an organization membership.

MVP organization-side roles are:

- `org_admin`
- `chief_td`
- `staff`

All organization-side users require MFA in MVP.

## MVP Role Definitions

### Org Admin

Primary focus:

- organization administration and access control

Typical responsibilities:

- manage organization profile and settings
- manage affiliates associated with the organization
- invite, activate, deactivate, and remove organization-side members
- assign organization-side roles
- review sensitive audit activity
- create tournaments unless the product later chooses to narrow this

Recommended constraints:

- should not automatically gain every tournament-operation permission if least privilege would be violated
- may be allowed operational access by role bundle for MVP simplicity, but the policy should permit narrowing this later

Planning recommendation:

Treat `org_admin` as the administrative super-role within an organization, while still routing checks through named permissions rather than bypass logic.

### Chief TD

Primary focus:

- tournament configuration authority and highest operational authority

Typical responsibilities:

- create and configure tournaments
- manage sections, eligibility rules, and operational settings
- publish tournaments
- override section eligibility
- generate, review, post, and edit pairings
- enter and correct results
- manage byes, withdrawals, check-in, and extra rated games
- prepare reporting artifacts and final submission support steps

Key exclusivity from confirmed decisions:

- only `chief_td` may edit pairings in MVP

### Staff

Primary focus:

- day-of-event and routine tournament operations with limited authority

Typical responsibilities:

- register walk-ins
- manage check-in
- generate pairings
- post pairings
- enter results
- manage byes and withdrawals

Recommended constraints:

- cannot change organization roles
- cannot edit pairings after generation unless elevated to `chief_td`
- cannot change foundational tournament policy unless explicitly granted later
- cannot finalize reporting if that is reserved to `chief_td` or `org_admin`

## Permission Catalog

The following catalog is a planning model for internal permission names and boundaries.

### Organization Administration Permissions

- `org.manage_profile`
- `org.manage_affiliates`
- `org.manage_members`
- `org.assign_roles`
- `org.view_audit`

### Tournament Configuration Permissions

- `tournament.create`
- `tournament.edit`
- `tournament.configure_sections`
- `tournament.configure_eligibility`
- `tournament.manage_visibility`
- `tournament.publish`

### Registration And Intake Permissions

- `registration.create_walkin`
- `registration.cancel_any`
- `registration.view_private_details`
- `registration.override_eligibility`
- `registration.flag_review`

### Payment And Check-In Permissions

- `payment.view_status`
- `payment.record_manual_status_note`
- `checkin.manage`

### Event Operations Permissions

- `pairing.generate`
- `pairing.post`
- `pairing.edit`
- `result.enter`
- `result.correct`
- `availability.manage`
- `tiebreak.view`
- `extra_rated_game.manage`
- `print_pairings`

### Reporting Permissions

- `reporting.view_readiness`
- `reporting.generate_exports`
- `reporting.manage_submission`

### Audit And Notes Permissions

- `audit.view_sensitive`
- `note.add_operational`

## Recommended MVP Role Mapping

### MVP Permission Matrix

This matrix is intentionally high-level. It is meant to make review of role boundaries faster before implementation.

| Capability Area | Org Admin | Chief TD | Staff | Player / Public |
| --- | --- | --- | --- | --- |
| Manage organization profile, affiliates, members, roles | Yes | No | No | No |
| View organization audit history | Yes | Limited to workflow audit visibility if later approved | No | No |
| Create and edit tournaments | Yes | Yes | No by default | No |
| Configure sections, eligibility, and operational settings | No by default | Yes | No | No |
| Publish tournaments | Yes | Yes | No | No |
| Register walk-ins and cancel registrations operationally | No by default | Yes | Yes | No |
| Override section eligibility | No by default | Yes | No | No |
| View payment/check-in operational state | Limited as needed for oversight | Yes | Yes | No |
| Manage check-in | No by default | Yes | Yes | No |
| Generate pairings | No by default | Yes | Yes | No |
| Post pairings | No by default | Yes | Yes | No |
| Edit pairings after generation | No by default | Yes | No | No |
| Enter initial results | No by default | Yes | Yes | No |
| Correct results | No by default | Yes | No | No |
| Manage byes and withdrawals | No by default | Yes | Yes | No |
| View tie-breaks and print pairings | No by default | Yes | Yes | Public may only view posted results/pairings |
| Generate reporting exports and manage submission | Limited readiness oversight by default | Yes | No | No |

Review note:

- `org_admin` is intentionally modeled as an administrative role first, not an automatic tournament-operations superuser.
- Where the matrix says "No by default", a future tournament-assignment or custom-role layer could widen access without changing the core permission model.

### Org Admin

Recommended permission bundle:

- `org.manage_profile`
- `org.manage_affiliates`
- `org.manage_members`
- `org.assign_roles`
- `org.view_audit`
- `tournament.create`
- `tournament.edit`
- `tournament.manage_visibility`
- `tournament.publish`
- `reporting.view_readiness`

Planning note:

Whether `org_admin` should also have the full operational bundle by default is an implementation choice. For least privilege, it is cleaner if operational powers are granted because the user is also assigned as `chief_td` or `staff` for tournament work.

### Chief TD

Recommended permission bundle:

- `tournament.create`
- `tournament.edit`
- `tournament.configure_sections`
- `tournament.configure_eligibility`
- `tournament.manage_visibility`
- `tournament.publish`
- `registration.create_walkin`
- `registration.cancel_any`
- `registration.view_private_details`
- `registration.override_eligibility`
- `registration.flag_review`
- `payment.view_status`
- `checkin.manage`
- `pairing.generate`
- `pairing.post`
- `pairing.edit`
- `result.enter`
- `result.correct`
- `availability.manage`
- `tiebreak.view`
- `extra_rated_game.manage`
- `print_pairings`
- `reporting.view_readiness`
- `reporting.generate_exports`
- `reporting.manage_submission`
- `note.add_operational`

### Staff

Recommended permission bundle:

- `registration.create_walkin`
- `registration.cancel_any`
- `registration.view_private_details`
- `payment.view_status`
- `checkin.manage`
- `pairing.generate`
- `pairing.post`
- `result.enter`
- `availability.manage`
- `tiebreak.view`
- `print_pairings`
- `note.add_operational`

Explicit exclusions in MVP:

- no `org.assign_roles`
- no `registration.override_eligibility`
- no `pairing.edit`
- no `result.correct` unless later approved
- no `reporting.manage_submission`

## Scope Model Recommendation

### Organization Membership As The Root

Authorization should start from `OrganizationMembership`.

Recommended shape:

- `User`
- `OrganizationMembership`
- role assignment or permission bundle reference
- optional tournament assignment records if later needed

### Tournament Assignment Layer

A second layer may be useful for tournament-specific staffing.

Recommended planning stance:

- preserve org-wide roles for MVP simplicity
- allow future addition of tournament assignment records so a staff member can be limited to specific tournaments

This keeps the MVP simple while avoiding an architecture dead end.

### Ownership And Data Filtering

Permissions alone are not enough. Queries and commands should also filter by scope.

Examples:

- a staff user should only see operational data for tournaments in their organization
- a player should only manage their own registrations or team actions
- public users should only see posted or public-facing data

## Workflow-Specific Authorization Notes

### Tournament Creation And Publishing

- `tournament.create` allows draft tournament creation
- `tournament.publish` allows making a tournament publicly visible
- publication should be audited

### Section Eligibility

- standard eligibility checks are system-driven
- `registration.override_eligibility` is reserved for `chief_td` in MVP
- override notes are allowed and should be encouraged for audit clarity

### Pairings

- `pairing.generate` may be granted to `staff` and `chief_td`
- `pairing.post` may be granted to `staff` and `chief_td`
- `pairing.edit` is reserved to `chief_td`

### Results

- `result.enter` may be granted to `staff` and `chief_td`
- `result.correct` should be treated as more sensitive than first entry and should at least be audited

### Reporting

- operational tournament work must continue even if reporting readiness is incomplete
- `reporting.manage_submission` should be narrower than everyday operational permissions
- final submission steps should require a clearly elevated role, recommended `chief_td` and possibly `org_admin`

## Open Authorization Questions

These are planning questions within the authorization design, not unresolved product-scope questions.

- whether `org_admin` should receive a small default operational bundle for MVP convenience or remain admin-only unless separately assigned
- whether tournament staffing should be represented by a dedicated tournament-assignment entity in MVP or deferred until after the first implementation slice
- whether audit visibility should be split into organization-administration audit versus tournament-operations audit
- whether `payment.record_manual_status_note` belongs with everyday staff work or should stay limited to `chief_td`
- whether section- or round-scoped permission narrowing is needed in MVP, or whether organization scope plus tournament ownership is sufficient initially

## MFA And Session Requirements

MVP requirement:

- all organization-side users must complete MFA

Recommended enforcement model:

- permission checks for organization-side surfaces require an organization-authenticated session with MFA satisfied
- recovery-code usage should still count as MFA satisfaction for the active session
- player/public self-service flows do not inherit org-side MFA requirements unless the user enters an org-side context

## Audit Requirements By Permission Area

The following permission areas should always produce auditable events when used:

- role assignment and membership changes
- affiliate changes
- tournament publication state changes
- eligibility overrides
- pairing edits
- result corrections
- reporting artifact generation and submission actions

## Recommended Implementation Shape Later

When implementation begins, a clean model would be:

1. define a canonical internal permission list
2. map roles to permission bundles in one place
3. evaluate permissions through a centralized policy service
4. attach scope checks to organization and tournament ownership
5. emit audit events from the same sensitive command paths

This keeps the system aligned with the architecture decision to avoid scattered role-name checks.

## Decisions Captured By This Artifact

- MVP org-side roles remain `org_admin`, `chief_td`, and `staff`
- authorization should be permission-based under the hood, even if role-driven in the UI
- `chief_td` is the only role that may edit pairings in MVP
- `staff` may generate pairings, post pairings, enter results, manage byes/withdrawals, and manage check-in
- organization-side actions require MFA in MVP
- organization scope is the root authorization boundary
- tournament assignment can be added later without invalidating the MVP model

## Follow-On Artifacts Recommended

The next most useful planning artifacts are:

- tournament creation and publishing workflow
- player registration workflow
- pairing generation, review, posting, and result entry workflow
- reporting and export workflow
