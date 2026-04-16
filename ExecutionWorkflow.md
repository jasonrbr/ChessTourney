# ChessTourney Execution Workflow

## Purpose

This document describes how implementation work should be executed after planning and architecture are approved.

`ProjectPlan.md` remains the source of truth for project scope, approved phases, decisions, and design artifacts.

## Workflow Rules

### Session Start

At the start of each implementation session:

- Identify the approved phase or milestone being worked on.
- Summarize the relevant prerequisite context.
- Call out any blockers, open questions, or scope conflicts before coding.

### Before Making Changes

- Review `ProjectPlan.md` and `DecisionLog.md`.
- Confirm the requested work fits the approved scope.
- Pause if the request conflicts with the approved plan or introduces meaningful scope creep.
- Avoid making business-rule assumptions about tournament logic, pairings, ratings, reporting, permissions, or federation-specific behavior.

### During Implementation

- Work in small, reviewable steps.
- Keep changes incremental and easy to understand.
- Update documentation as implementation progresses.
- Surface risks, dependencies, and tradeoffs instead of silently choosing around them.
- If a materially better approach would change the plan, discuss it before proceeding.

### Documentation Expectations

Maintain project documentation as work progresses, including:

- implementation progress
- architectural decisions
- confirmed requirements relevant to the current phase
- unresolved questions
- integration assumptions and limitations
- setup, run, and test instructions
- change log or implementation log entries when useful

Documentation should clearly distinguish:

- confirmed facts
- recommendations
- unresolved items
- temporary workarounds

### Git And Review

- Use git throughout implementation.
- Make meaningful, reviewable commits.
- Keep commit messages clear and scoped.
- Do not bundle unrelated work into a single commit.
- Suggest a commit strategy before larger phases if that will help reviewability.

### End Of Phase Reporting

At the end of each implementation phase or milestone:

- summarize what was completed
- summarize what changed
- note tests run and results
- note what remains
- note risks, blockers, or decisions needed
- recommend the next implementation step

## Execution Principles

- Prefer many smaller implementation phases over one large push.
- Preserve maintainability and future growth.
- Keep the system understandable for future review.
- Do not skip documentation just because the code is clear.
- Favor transparency and traceability over speed.
