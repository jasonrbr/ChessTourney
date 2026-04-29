# ChessTourney Ready-To-Code Checklist

## Purpose

This checklist defines the minimum planning sign-off recommended before implementation starts.

It is intentionally narrow so the team can begin coding soon without pretending every future detail is already known.

## Current Recommendation

Coding can begin once the items in **Must Finish Before Coding** are reviewed and accepted.

Items in **Can Follow Immediately After Coding Starts** are still important, but they should not block the first implementation slice unless that slice directly depends on them.

See `ImplementationPlan.md` for the proposed default stack, recommended answers to the remaining architecture questions, and the suggested first coding milestone.

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

## Can Follow Immediately After Coding Starts

- deeper audit-event specialization
- section- or round-scoped permission narrowing
- richer reporting automation details beyond export/manual-first support
- public tie-break presentation refinements
- post-MVP federation expansion concerns

## Recommended First Slice

If the team wants the fastest path to useful progress, the recommended first slice is:

1. identity and organization membership foundation
2. tournament creation and publication
3. registration intake with separate payment state

This sequence establishes the core tenancy, authorization, and event lifecycle boundaries before the more complex pairing and reporting workflows are built.

## Exit Condition For Planning Phase

The planning phase is ready to close when:

- the remaining must-finish items are either completed or explicitly deferred by decision
- the implementation stack is chosen
- the first implementation slice is approved
- the team agrees that unresolved items are not likely to force an early rewrite
