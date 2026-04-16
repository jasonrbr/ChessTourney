# ChessTourney Domain Model

## Purpose

This document captures the initial core domain model for planning.

It is not a final database schema. Its goal is to define the main entities, relationships, ownership boundaries, and state concepts that must be stable before implementation begins.

## Status

- Planning phase artifact
- Initial draft based on confirmed requirements and architecture overview
- Subject to review before coding begins

## Modeling Principles

- Organization ownership should be explicit for administrative and operational data.
- Public visibility should be modeled explicitly rather than inferred from existence.
- Registration state and payment state remain separate.
- Operational corrections should preserve audit history.
- Federation-specific behavior should be bounded rather than spread across unrelated entities.
- Optional player accounts should not block public registration flows.

## Core Entity Groups

### Identity And Access

#### User

Represents an authenticated person in the system.

Key responsibilities:

- account identity for organization-side users
- optional player account identity
- authentication enrollment state

Likely relationships:

- one user can have many organization memberships
- one user can have many MFA methods or recovery artifacts
- one user may be linked to one or more player identity records over time

#### Organization

Represents a club or organizing body using the platform.

Key responsibilities:

- tenancy boundary for administration and operations
- ownership of tournaments, staff memberships, and affiliates

Likely relationships:

- one organization has many organization memberships
- one organization has many tournaments
- one organization may manage one or more affiliates over time

#### OrganizationMembership

Represents a user's membership in an organization.

Key responsibilities:

- org-scoped membership status
- role assignment entry point
- organization-specific permissions context

Likely relationships:

- belongs to one user
- belongs to one organization
- may carry one role or a set of permissions, depending on final auth design

#### Role / Permission Policy

Represents authorization rules for org-side users.

Key responsibilities:

- least-privilege access control
- extensible permission model beyond hard-coded role checks

Design note:

This may be implemented as role definitions plus permission grants rather than a standalone end-user-managed entity set.

### Tournament Configuration

#### Affiliate

Represents the affiliate context tied to rated tournaments where required.

Key responsibilities:

- identify the affiliated body used for rated event submission context
- support the rule that rated events require exactly one affiliate

Likely relationships:

- may belong to an organization
- may be associated with many tournaments over time

#### Tournament

Represents an event.

Key responsibilities:

- event-level configuration and lifecycle
- visibility state
- rating/reporting context
- payment/check-in settings

Likely relationships:

- belongs to one organization
- may reference one affiliate
- has many sections
- has many registrations through sections
- has many rounds, audit events, reporting packages, and extra rated games

Likely key attributes:

- title
- status or lifecycle state
- visibility state
- tournament format family
- rating context flags for USCF and optional FIDE rating
- check-in enabled flag
- payment mode configuration

#### Section

Represents a tournament section.

Key responsibilities:

- section-level registration target
- section eligibility policy
- section-specific tournament behavior

Likely relationships:

- belongs to one tournament
- has many registrations
- has many rounds
- may have many teams in team events

Likely key attributes:

- name
- section type or format variant
- eligibility rule configuration
- unrated-player eligibility policy
- acceleration method configuration where applicable

### Player Identity And Registration

#### PlayerProfile

Represents a player identity record used for registration and tournament participation.

Key responsibilities:

- capture player-facing identity independent from whether the player has an account
- hold federation identifiers and player lookup data used by registration workflows

Likely relationships:

- may optionally link to a user
- has many registrations
- may be referenced in team membership, pairings, and results

Likely key attributes:

- display name fields
- USCF ID
- optional FIDE ID if needed later
- membership expiration data if available
- rating snapshot inputs or references as allowed by policy

Design note:

 is a planning name. Final naming may change to distinguish between canonical player identity, lookup snapshots, and event-specific data.

#### Registration

Represents a player's registration in a specific section.

Key responsibilities:

- player entry into a tournament section
- registration state tracking
- section eligibility result and override tracking
- walk-in and self-service registration support

Likely relationships:

- belongs to one player profile
- belongs to one tournament
- belongs to one section
- may reference payment records
- may reference check-in state
- may trigger audit events and review flags

Likely key attributes:

- registration state: registered, cancelled, checked_in, withdrawn
- registration source: public or staff-created
- eligibility outcome
- override flag and optional note
- timestamps for registration and cancellation

#### PaymentRecord

Represents payment intent, hosted checkout outcomes, or pay-onsite commitment.

Key responsibilities:

- payment-state tracking independent from registration state
- hosted payment reconciliation
- pay-onsite tracking

Likely relationships:

- belongs to one registration
- may have multiple records over time if retries or later payment occur

Likely key attributes:

- payment method type
- payment status
- amount and currency
- provider reference when applicable

#### CheckInRecord

Represents staff-managed check-in state for a registration when enabled.

Key responsibilities:

- track event check-in separately from base registration state if needed
- preserve who checked in the player and when

Likely relationships:

- belongs to one registration
- acted on by a staff user or membership

Design note:

This could remain a field on  if the workflow stays simple, but a dedicated record may be cleaner for auditability.

### Team Events

#### Team

Represents a team within a team event context.

Key responsibilities:

- roster grouping for team events
- captain ownership
- one-team-per-event enforcement via membership rules

Likely relationships:

- belongs to one section or tournament event scope
- has many team memberships
- may designate one captain linked to a player profile or registration

#### TeamMembership

Represents a player's membership in a team.

Key responsibilities:

- invitation and acceptance workflow
- team roster state tracking

Likely relationships:

- belongs to one team
- belongs to one registration or player profile

Likely key attributes:

- membership status: invited, accepted, declined, left, removed
- invitation timestamp
- response timestamp

### Event Operations

#### Round

Represents a round within a section.

Key responsibilities:

- sequencing of operational rounds
- grouping pairings and round-level state

Likely relationships:

- belongs to one section
- has many pairings

#### Pairing

Represents an assigned pairing or board entry.

Key responsibilities:

- pair two competitors or assign a bye
- hold posting visibility and pairing revision state

Likely relationships:

- belongs to one round
- references one or more registrations, players, or teams depending on event type
- has zero or one result record

Likely key attributes:

- board number or pairing order
- pairing status
- posted state
- revision metadata

#### Result`r`n`r`nRepresents the scored outcome tied to a pairing.

Key responsibilities:

- result entry
- correction tracking
- downstream reporting input

Likely relationships:

- belongs to one pairing
- may have audit events or correction history entries

Likely key attributes:

- result code
- entered by
- entered at
- correction note or reason when applicable

#### AvailabilityAction

Planning placeholder for bye and withdrawal operations that affect pairing eligibility.

Key responsibilities:

- track withdrawal and bye requests/actions
- support regeneration and operational history

Likely relationships:

- belongs to one registration
- may be tied to a round when applicable

Design note:

This may become separate entities for  and , but keeping it grouped in planning keeps the model flexible.

#### ExtraRatedGame

Represents extra rated games reported with the event but excluded from event scoring.

Key responsibilities:

- support reporting requirements without altering main event standings

Likely relationships:

- belongs to one tournament
- references participating player profiles

### Audit, Notifications, And Reporting

#### AuditEvent

Represents an auditable action.

Key responsibilities:

- preserve traceability for sensitive changes
- support review of corrections and overrides

Likely relationships:

- belongs to one organization or tournament context
- may reference the acting user or org membership
- may reference a target entity generically

#### NotificationRecord

Represents notification attempts or deliveries.

Key responsibilities:

- record opt-in notification activity
- support invitation and operational messaging history

Likely relationships:

- may reference a user, player profile, registration, or team membership

#### ReportingPackage

Represents an export or submission-preparation artifact.

Key responsibilities:

- package tournament data for USCF/FIDE/manual workflows
- track validation state and readiness for final submission

Likely relationships:

- belongs to one tournament
- may contain one or more export artifacts

## Relationship Summary

At a high level:

-  owns 
-  and  connect through 
-  owns 
-  participates through 
-  connects player identity, section placement, payment state, and operational status
-  owns 
-  owns 
-  owns 
-  and  sit alongside registration for team events
- , , and  attach across the model as cross-cutting support entities

## Important State Boundaries

The following states should remain conceptually separate:

- tournament lifecycle state versus tournament visibility state
- registration state versus payment state
- registration state versus check-in state if modeled separately
- pairing generated state versus pairing posted/public state
- result entry state versus correction/audit history
- team invitation state versus accepted roster membership state
- reporting validation state versus final submission state

## Open Modeling Questions

These are architecture questions, not unresolved product requirements:

- whether  should be a standalone entity or a field set on 
- whether pairing participants should reference registrations directly or a more abstract competitor slot model
- whether team-event pairings need a specialized pairing model separate from individual pairings
- how to model rating snapshots and eligibility evidence without over-coupling to external lookup assumptions
- whether audit events should be fully generic or partially specialized for sensitive workflows

## Recommended Next Artifact

The next most useful artifact is a role and permission model, followed by workflow diagrams for registration and event operations.

