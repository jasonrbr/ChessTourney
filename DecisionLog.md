# ChessTourney Decision Log

## 2026-04-29

### Confirmed Decisions

- The recommended implementation baseline is now `SvelteKit` plus TypeScript, `PostgreSQL`, and `Prisma`.
- The first coding milestone is `Foundation, Organization Access, And Tournament Management Screens`.
- The first milestone should prioritize tournament-management screens and publication workflows before registration, payments, pairings, or reporting implementation work.
- `Better Auth` is the recommended starting auth layer for organization-side sign-in/session handling.
- Full MFA hardening UX may be deferred from the first implementation slice if that helps the project start faster, but the architecture must preserve the MVP MFA requirement for organization-side users.
- `Stripe` is deferred from the first implementation slice.
- `Resend` is deferred from the first implementation slice.
- Payment and notification boundaries should still be preserved so those services can be added later without rewriting core workflow logic.
- `CheckInRecord` should be modeled as a standalone entity.
- Pairings should use a lightweight competitor abstraction rather than pointing only to `Registration`.
- Team events should share the main pairing lifecycle model rather than using a separate pairing table in the MVP.
- `org_admin` should remain admin-only by default; tournament-operation powers should come from `chief_td` or `staff` assignment.
- Tournament-specific staffing/assignment records are deferred from the first implementation slice.
- Milestone 1 implementation has started with a `SvelteKit` scaffold and first-pass organization-side tournament-management screens.
- The first implementation pass is using typed mock tournament data to establish route structure and UI flow before Prisma-backed persistence is added.

## 2026-04-16

### Confirmed Decisions

- The product will support multiple organizations/clubs from the start.
- MVP is focused on over-the-board tournament management.
- MVP user groups include organization admins, Chief TDs, Staff, and players.
- A single user may belong to multiple organizations.
- Rated events must have exactly one affiliate.
- Unrated events may have zero affiliates.
- MVP is USCF-first, but must support events that are both USCF-rated and FIDE-rated.
- FIDE-only events are out of MVP scope.
- Non-US federation workflows are deferred unless they are low complexity after the USCF path is working.
- Initial roles are Org admin, Chief TD, and Staff.
- Permissions should follow least-privilege principles and remain extensible.
- MFA is required for all organization-side users in MVP.
- MVP MFA uses email/password plus TOTP, with recovery codes.
- Players may register without creating an account.
- Optional player accounts exist for tournament history and autofill.
- Swiss, Round Robin, and Team events are required in MVP.
- Tournaments can have multiple sections.
- Players register directly into a qualifying section.
- The app should explain section ineligibility.
- Chief TDs may override section eligibility.
- Section eligibility uses official posted USCF ratings only.
- Changes affecting eligibility after registration should be flagged for TD review.
- Unrated-player eligibility is configurable by the TD.
- Accelerated pairings are required using a small set of standard methods.
- Teams are captain-created from already-registered players.
- Team membership requires explicit player acceptance.
- Players should be notified when added to a team and be able to leave the team.
- A player may belong to only one team per event.
- Rated-event registration requires a valid USCF ID.
- The app does not create USCF IDs.
- Membership expiration before event end should trigger a warning and renewal link, but should not block registration.
- Registration constraints should be enforced by the app.
- Walk-in registration by TD/Staff is allowed.
- Players may cancel their own registrations.
- MVP registration statuses are registered, cancelled, checked_in, and withdrawn.
- Payment state is tracked separately from registration state.
- Check-in is optional and staff-managed only.
- Pairings are system-generated.
- Only the Chief TD may edit pairings.
- Staff may generate and post pairings.
- Pairings remain hidden until posted.
- Staff may enter results.
- Result entry is TD/Staff-only in MVP.
- Staff may manage withdrawals and byes and regenerate pairings as needed.
- TDs need printable pairings for over-the-board operation.
- Players may view posted pairings and results online.
- Extra rated games that do not affect event scoring must be supported.
- Tie-breaks should be visible to TDs.
- Tournaments are public by default, but visibility is configurable per tournament.
- Rosters, pairings, and results are public in MVP.
- MVP supports hosted online payments and a pay-onsite option.
- Registration requires either online payment or pay-onsite selection.
- Players may return later to pay online if they initially chose pay-onsite.
- Payment status tracking is required.
- Waitlists are not currently in MVP scope.
- Submission should use direct integration where possible and export/manual fallback otherwise.
- Reporting validation should be implemented, but round-to-round operations must not be blocked.
- Final submission should be blocked when reporting validation fails.
- Sensitive actions and result corrections should be auditable.
- TD notes should be supported but optional.
- Accessibility is first-class and MVP should target WCAG 2.1 AA.
- Email notifications are opt-in.
- Passwordless authentication and passkeys are deferred to a post-MVP enhancement.
- Architecture diagrams and related design artifacts are required before implementation begins.
- Discovery verification completed using official US Chess and FIDE sources; direct public APIs for submission and member data remain unverified and must not be assumed.

### Still Open

- No open discovery questions currently recorded.
