# ChessTourney Offline Operations Plan

## Purpose

This document defines the MVP offline boundary for running an over-the-board tournament when internet connectivity is unavailable or unreliable.

The goal is not to make the entire product offline-first. The goal is to make day-of-event operations resilient once registration and tournament setup are ready.

## Status

- Planning artifact
- Added after Milestone 1 implementation started
- Intended to guide event-operations architecture before pairing, result, and check-in workflows are implemented

## Offline Strategy

ChessTourney should remain a hosted web application for setup, registration, payment, account, publishing, and reporting-submission workflows.

For tournament operations, the app should also support a PWA-based offline mode. An authorized organization-side user should be able to prepare a tournament for offline operations before the event starts. The browser then stores the operational packet locally and allows selected workflows to continue if connectivity is lost.

## Product Boundary

### Online Required

These workflows may require an internet connection in MVP:

- public tournament discovery
- player self-service registration
- payment processing
- email notifications
- account creation and organization-side sign-in
- organization membership and role management
- USCF/FIDE lookup, validation, or submission workflows
- publishing public updates to the hosted website

### Offline Supported

These workflows should be designed to work offline in MVP or as part of the event-operations milestone:

- view downloaded tournament, section, and roster data
- staff-managed check-in
- generate pairings
- view pairings
- print pairings
- enter results
- correct results with audit history
- manage byes and withdrawals
- regenerate pairings when allowed by tournament state
- view standings and TD-visible tie-breaks
- generate local results/standings exports
- export a local tournament backup or sync package

### Offline With Explicit Warning

These workflows may be allowed offline only if the UI makes the risk clear and preserves review data:

- staff-created walk-in registrations
- TD eligibility overrides
- late section changes
- extra rated games

Any offline version of these actions should be marked for review when synced back to the hosted system.

## Offline Tournament Packet

Preparing a tournament for offline operations should download the minimum operational data needed to run the event:

- tournament identity, organization identity, lifecycle state, and visibility state
- tournament format and rating context
- sections and eligibility policy snapshots
- affiliate context needed for rated-event awareness
- registrations, player identity snapshots, and rating/eligibility evidence available at download time
- teams and accepted team memberships when relevant
- check-in state
- rounds, pairings, pairing revisions, and posted-state data
- results and correction history
- byes, withdrawals, and availability actions
- extra rated games when relevant
- audit events relevant to operational state
- export metadata needed for local reporting outputs
- app/build version and packet schema version

The packet should be treated as a snapshot plus an append-only queue of local operational changes.

## Local Storage Recommendation

Use browser local storage appropriate for PWA operation:

- Cache Storage for the application shell and static assets
- IndexedDB for tournament packets and operational data
- a manifest/service worker so the app can be installed and reopened without network access

The local data model should be versioned. The app should detect when an offline packet was created by an incompatible app version and provide a recovery/export path instead of silently corrupting data.

## Command-Oriented Operations

Event operations should be implemented as explicit commands that can run against hosted storage or local PWA storage.

Examples:

- `prepareOfflineTournament`
- `checkInRegistration`
- `createWalkInRegistration`
- `recordBye`
- `withdrawRegistration`
- `generatePairings`
- `postPairings`
- `editPairing`
- `enterResult`
- `correctResult`
- `generateStandingsExport`

Each command should produce auditable metadata:

- stable command id
- tournament id
- actor id or local actor snapshot
- local device/session id
- timestamp
- command type
- before/after or event payload as appropriate
- sync status

This avoids tying event operations directly to server-only form submissions.

## Sync Model

The MVP sync model should be conservative:

- hosted data remains the source of truth when online
- offline actions are queued locally as auditable commands
- reconnecting uploads the queued commands for validation and replay
- the server may accept, reject, or mark commands for review
- rejected or review-needed commands must remain visible to the TD

The simplest acceptable first version can assume a single offline operations device per tournament. Multi-device offline editing should be treated as a later enhancement unless explicitly prioritized.

## Conflict Policy

Initial conflict handling should prefer clarity over automation.

Likely conflict examples:

- two devices enter different results for the same pairing
- hosted registration changes after an offline packet is downloaded
- a player is moved sections online after offline pairings are generated
- walk-in or eligibility override data conflicts with hosted validation

Recommended MVP stance:

- avoid multi-device offline operations by default
- warn when the packet is stale
- require a fresh download before offline mode when possible
- preserve every conflicting local command
- let Chief TD resolve conflicts manually in a review screen

## UX Requirements

Offline operations need clear state indicators:

- online/offline status
- tournament packet downloaded or not downloaded
- last synced time
- local unsynced change count
- stale packet warning
- sync failure and retry state
- export-backup prompt before risky operations or app upgrades

The UI should never imply that offline pairings/results are visible to public users until they have synced and been published by the hosted system.

## Security And Privacy Considerations

Offline packets may contain personal player data and operational event data.

Requirements:

- only authorized org-side users can prepare an offline packet
- offline packet preparation should require an authenticated organization session
- local data should be clearable from the UI
- sensitive exports should include warnings about local file handling
- packet contents should avoid unnecessary personal data
- future native wrappers may add stronger local storage controls, but PWA storage is the starting point

## Implementation Implications

Before implementing event operations deeply:

- keep route handlers thin
- place operational business rules in services/command handlers
- centralize authorization checks
- model audit events from the same command paths used online and offline
- separate public posting from local operational visibility
- make print/export generation available from local data

## Open Questions

- whether MVP offline operations should allow staff-created walk-ins or require manual paper backup for walk-ins
- whether only one device may hold the active offline operations packet for a tournament
- how long an offline packet remains valid before forcing refresh or warning heavily
- whether local packet data should be encrypted in the PWA version or deferred to a native wrapper
- how much reporting/export generation should be available before sync

## Recommended Sequencing

1. Continue Milestone 1 as planned with hosted tournament setup and persistence.
2. Add PWA shell and offline-readiness infrastructure before event operations.
3. Implement registration and payment-state workflows as online-first.
4. Implement check-in, pairings, results, printing, and exports through command handlers that can later target local storage.
5. Add offline packet download, local command queue, local export, and sync/review workflows before relying on the app for real tournament operations.
