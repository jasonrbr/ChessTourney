# ChessTourney Decision Log

## 2026-06-08

### Confirmed Decisions

- Individual game results are now tracked per game. This supersedes the 2026-05-02 decision that "individual game results are not tracked in the current UI." Each two-game double-round pairing is modeled as two `Game` rows.
- A `Game` model is the source of truth for per-game color and result. Each `Game` stores `gameNumber` (1 or 2), an explicit `whiteRegistrationId` and `blackRegistrationId`, and a nullable `result` (`WHITE_WIN | DRAW | BLACK_WIN`). Game 1 uses the pairing's planned colors; game 2 swaps them. This replaces the previous `Pairing.whiteFirstRegistrationId/blackFirstRegistrationId/whiteFirstScoreUnits/blackFirstScoreUnits` columns, which encoded a combined two-game score from the "white-first" player's perspective and required mental color inversion.
- Color belongs to `Game`, not `Pairing`. A GAME `Pairing` now owns two `Game` rows and keeps only board/type/status and bye fields. Bye pairings still use the `Pairing` bye fields and have no games.
- The Swiss pairing planner (`domain/pairings.ts`) is unchanged. It still reasons in terms of game-1 colors; the server projects each existing pairing's game 1 onto the planner's white-first/black-first shape, and persists planned colors as two `Game` rows. Rule 29E color history and repeat-opponent detection therefore continue to use game-1 color.
- Standings now tally wins/draws/losses per game. A split double round (one win + one loss) is recorded as 1 win and 1 loss for each player, not as a draw — fixing a latent bug in the previous combined-score derivation.
- Result entry records each game's outcome via per-game result controls (one win / draw / other win) with a live combined readout, rather than a single combined score input. The same control is reused for current-round entry, past-round corrections, and the read-only COMPLETE view.
- US Chess tournament submission is treated as manual online entry for now (the TD/Affiliate online form), not automated file upload. The accepted software-upload format is the three dBASE files (`THEXPORT/TSEXPORT/TDEXPORT.DBF`); no open third-party field spec is published, so generating them is deferred. CSV and FIDE "TRF" exports were rejected as not useful for US Chess submission.
- To support manual entry, a read-only USCF-style rating report (numbered crosstable, one row per player, per-round games with result + opponent number, players ranked by final standing) is available per section at `/org/tournaments/[slug]/run/report`, with a print-to-PDF button (browser "Save as PDF") and a print stylesheet. No server-side PDF generation.

## 2026-05-11

### Confirmed Decisions

- The Dutch variation of the Swiss pairing system (score-group splitting) is the required pairing algorithm. Players are grouped by score, each group is split in half, and top[i] is paired with bottom[i]. Odd-sized groups float the lowest player down to the next score group. The previous greedy fold (which paired consecutive players regardless of score groups) is replaced.
- Pairings backtrack within the split halves to avoid repeat opponents before falling back to carrying floaters forward. A full permutation search is acceptable given the small field sizes typical of club events.
- Color assignment follows USCF Rule 29E. The player with the lower cumulative White/Black balance (more Blacks played) gets White. On equal balance, the player who played Black most recently gets White. If both have the same last color or neither has color history, the top-half player gets White as a final fallback.
- Byes are displayed at the bottom of a round's pairing list and carry no board number. Game board numbers are assigned sequentially from 1, unaffected by any board numbers stored on bye records in the database.
- The run page shows all rounds newest-first, not only the current round. Past rounds render in collapsed accordion panels by default; the current round starts open. A Complete or In Progress badge is visible in the panel header without expanding.
- Results are fully read-only when tournament status is COMPLETE. Score inputs, preset buttons, and save actions are hidden.
- TDs may correct scores in any past round at any time without affecting subsequent rounds' pairings. Saving corrected results is an isolated write to the affected pairing records only.
- A "Regenerate pairings" action on the current round deletes only the latest round and immediately re-generates it, picking up any score corrections from earlier rounds. No other rounds are touched.
- Pairing display shows each player's score going into that round (cumulative from all prior rounds), not their current total. This matches the standing the pairing algorithm used when the round was generated.
- The generate-round button and per-player bye request forms are hidden (not just disabled) once all configured rounds have been generated.
- The service layer is split into four focused modules — `tournaments.ts`, `registrations.ts`, `pairings.ts`, and `form-utils.ts` — rather than one monolithic `tournament-service.ts`. `tournament-service.ts` is kept as a re-export barrel for backward compatibility.
- Section eligibility logic is consolidated into a single `checkEligibility(section, rating)` function returning a discriminated union (`HARD_BLOCKED | NEEDS_REVIEW | ELIGIBLE`). Derived DB write values come from `eligibilityDbFields`. Prior fragmented eligibility checks are removed.
- Three targeted DB query functions replace the general-purpose `getTournamentBySlug`: `getTournamentWorkspace` (full include for TD), `getTournamentForPublic` (same include for public detail and standings), `getTournamentForRegistration` (sections only for registration form).
- A partial unique index on `Registration(tournamentId, playerId) WHERE status = 'REGISTERED'` prevents two active registrations for the same player in the same tournament. It lives in `prisma/custom-constraints.sql` because the Prisma schema DSL does not support conditional indexes; it must be applied manually after `prisma db push` and incorporated into a migration when the project moves to `prisma migrate dev`.
- The TD workspace is split into two pages: `/org/tournaments/[slug]` for settings (tournament fields, sections, publish/unpublish) and `/org/tournaments/[slug]/run` for operations (status controls, registration review, walk-ins, bye requests, round pairings, results, standings). This prevents cluttering the settings form with operational controls that do not belong there.
- `DATABASE_URL` must be passed to Prisma via `$env/static/private` in `db.ts` rather than relying on `process.env`. Vite 8 does not inject `.env` variables into `process.env`; they are only available through SvelteKit's env modules.
- The public tournament listing shows a Register button only when status is `SETUP` or `REGISTRATION_OPEN`. Completed and in-progress tournaments show a View Details link instead.
- The public page link in the TD workspace is hidden when the tournament is still a draft. The public detail route returns 404 for unpublished tournaments by design.
- Archiving tournaments from the TD workspace is a recognized gap but is deferred. No decision on archive representation or behavior has been made yet.

### Still Open

- Whether the next implementation slice should prioritize organization/auth/MFA or continue toward a hosted test-run event with export/audit/offline-readiness improvements.
- How TD overrides for section eligibility should be represented in the database and audit log.
- What minimal result export format is most useful for the first real tournament test.
- How tournament archiving should work (hide from active list, prevent modification, etc.).

## 2026-05-02

### Confirmed Decisions

- The current test-run implementation intentionally skips user/auth setup so the tournament-running workflow can be tested sooner.
- PostgreSQL remains the local database target; do not switch the implementation to SQLite for the MVP path.
- The initial runnable event format is Blitz Double Round Swiss, where each pairing represents two games and result entry records each player's combined score.
- Pairings show the player who has White in the first game; individual game results are not tracked in the current UI.
- Requested bye default score and odd-player pairing bye score are tournament-level configuration fields.
- Pairing byes and requested byes must display both bye type and awarded score.
- Section eligibility is configurable per section with rating floor, rating ceiling, and unrated-player policy.
- The seed script may remain sample-data oriented, but it should not wipe unrelated local data.
- Unit tests should focus on hard tournament logic such as scoring, standings, and pairing behavior rather than testing that Svelte renders normally.

### Still Open

- Whether the next implementation slice should prioritize organization/auth/MFA or continue toward a hosted test-run event with export/audit/offline-readiness improvements.
- How TD overrides for section eligibility should be represented in the database and audit log.
- What minimal result export format is most useful for the first real tournament test.

## 2026-05-01

### Confirmed Decisions

- PWA-based offline support is now an explicit requirement for day-of-event tournament operations.
- The full product does not need to be offline-first in MVP.
- Public registration, payments, account management, email notifications, federation lookup, and federation submission may require internet access.
- Offline-capable workflows should focus on check-in, pairings, printing pairings, result entry, result corrections, byes, withdrawals, standings/results exports, and local backup/export.
- Offline operation should start from an authorized online preparation step that downloads a tournament operations packet.
- Offline changes should be captured as auditable local commands and synced back to the hosted system for validation and replay.
- Hosted data remains the source of truth after sync validation.
- The MVP may assume a conservative single-active-offline-device model unless later changed.
- Prize categories should be configurable per tournament section.
- Prize awards may be cash, non-cash, or combined cash-plus-non-cash.
- Prize eligibility should be based on event rating snapshots or explicitly announced rating policy, not changing live ratings after the event.
- Prize modeling must distinguish closed rating-class prizes from under-rating prizes.
- Both closed rating bands and overlapping under-threshold prize categories must be supported.
- Normal prize calculation should follow US Chess defaults for one cash prize per player, tied-prize pooling, and no player choice among eligible cash prizes.
- Overlapping under-threshold categories use normal cash-prize pooling and one-prize behavior unless configured as special/additive.
- Non-cash award ties should default to tie-break resolution, with TD-visible tie-break explanations and TD override support.
- Combined cash-plus-non-cash awards should default to separate cash and non-cash calculation, with a TD-configurable same-recipient variation when announced.
- Based-on prize funds are in MVP scope.
- Additive/special prizes should be explicitly configured and publicly described as such.
- Additive/special prizes may stack with other prize categories.

### Still Open

- Whether staff-created walk-ins are allowed while offline or deferred to paper/manual handling.
- Whether the single-active-offline-device rule is enforced technically in MVP or expressed as a workflow constraint.
- How stale an offline tournament packet may be before refresh is required or strongly warned.
- Whether PWA local data encryption is required for MVP or deferred to a later native wrapper/security hardening step.

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
