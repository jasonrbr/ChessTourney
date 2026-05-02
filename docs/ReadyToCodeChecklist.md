# ChessTourney Ready-To-Code Checklist

## Purpose

This checklist defines the minimum planning sign-off recommended before implementation starts.

It is intentionally narrow so the team can begin coding soon without pretending every future detail is already known.

## Current Recommendation

Milestone 1 coding has begun using the baseline in `ImplementationPlan.md`.

Items in **Can Follow Immediately After Coding Starts** remain important, but they should not block the current implementation slice unless that slice directly depends on them.

See `ImplementationPlan.md` for the proposed default stack, recommended answers to the remaining architecture questions, and the suggested first coding milestone.

Offline tournament operations are now an explicit event-operations requirement. This does not block the current Milestone 1 persistence work, but it should be resolved before making check-in, pairings, result entry, printing, or event exports offline-capable.

## Must Finish Before Coding

### 1. Complete The Remaining Critical Workflow Artifacts

- [x] Tournament creation and publishing workflow
- [x] Player registration workflow
- [x] Pairing generation, review, posting, and result entry workflow
- [x] Reporting/export/submission workflow
- [ ] Staff check-in workflow if check-in is included in the first coding slice
- [ ] Team creation and acceptance workflow if team events are included in the first coding slice

### 2. Resolve The Small Set Of Architecture Questions That Affect Early Data Shape

- [ ] Decide whether `CheckInRecord` is a standalone entity or stays embedded in `Registration`
- [ ] Decide whether `Pairing` points directly to `Registration` or to a more abstract competitor-slot model
- [ ] Decide whether team events need a specialized pairing model in MVP
- [ ] Decide whether `org_admin` is admin-only by default or receives a limited operational bundle
- [ ] Decide whether tournament-specific staffing/assignment exists in MVP or is deferred

### 3. Finalize The Initial Integration Boundary Stance

- [x] Confirm the internal adapter boundary for USCF lookup/reporting assumptions
- [x] Confirm the internal adapter boundary for FIDE export/reporting assumptions
- [x] Confirm the internal adapter boundary for the payment processor
- [x] Confirm the internal adapter boundary for email/notification delivery

### 4. Choose The Actual Implementation Stack

- [x] Frontend approach
- [x] Backend approach
- [x] Database choice
- [x] Authentication/MFA approach
- [x] Background job strategy if needed
- [x] Export/file-generation approach

### 5. Approve The First Implementation Slice

- [x] Name the first milestone
- [x] Define what is in scope for the first slice
- [x] Define what is explicitly stubbed or deferred
- [x] Define acceptance criteria for that slice

### 6. Define Offline Event Operations Boundary

- [x] Confirm that registration, payments, account management, notifications, and federation submission may remain online-only in MVP
- [x] Confirm that day-of-event operations should be PWA-capable during connectivity loss
- [x] Define the initial offline tournament packet contents
- [x] Define the local command queue and sync/review stance
- [ ] Decide whether MVP permits staff-created walk-ins while offline
- [ ] Decide whether MVP enforces a single active offline operations device per tournament
- [ ] Decide how stale an offline packet can be before refresh is required or heavily warned

## Can Follow Immediately After Coding Starts

- deeper audit-event specialization
- section- or round-scoped permission narrowing
- richer reporting automation details beyond export/manual-first support
- public tie-break presentation refinements
- post-MVP federation expansion concerns
- PWA manifest/service worker implementation
- local IndexedDB schema for offline tournament packets
- sync/review UX for offline command replay

## Recommended First Slice

If the team wants the fastest path to useful progress, the recommended first slice is:

1. identity and organization membership foundation
2. tournament creation and publication
3. registration intake with separate payment state
4. offline-readiness infrastructure before event operations

This sequence establishes the core tenancy, authorization, and event lifecycle boundaries before the more complex pairing and reporting workflows are built.

## Exit Condition For Planning Phase

The planning phase is ready to close when:

- the remaining must-finish items are either completed or explicitly deferred by decision
- the implementation stack is chosen
- the first implementation slice is approved
- the team agrees that unresolved items are not likely to force an early rewrite

Current note:

- this threshold has been treated as met for Milestone 1
- remaining items are now implementation follow-ups rather than blockers for the current slice
- a Prisma-backed Double Round Swiss test-run slice now exists, but org auth/MFA, payments, exports, printing, reporting, prize calculation, and offline PWA support are still future work
