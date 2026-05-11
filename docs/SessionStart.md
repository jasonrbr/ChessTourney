Read docs/ProjectPlan.md, docs/ExecutionWorkflow.md, docs/ArchitectureOverview.md, docs/DomainModel.md, docs/DecisionLog.md, docs/ImplementationPlan.md, and docs/OfflineOperationsPlan.md first.

If shell, path, or editing behavior seems odd, also read docs/WorkspaceNotes.md before continuing.

Summarize:
- the current approved phase
- the highest-priority confirmed decisions relevant to architecture
- the main dependencies and blockers before coding
- the open architecture questions from docs/DomainModel.md
- the offline tournament-operations boundary from docs/OfflineOperationsPlan.md
- the current code state from docs/ImplementationPlan.md

Do not code until that summary is done.

After the summary, continue with the currently approved implementation milestone unless the requested work conflicts with the plan.

Current code note: the repo has a Prisma-backed Dutch-variation Double Round Swiss test-run slice with public registration, guest registration flow, and a split TD workspace (settings page + run page). The service layer is split into focused modules (tournaments, registrations, pairings, form-utils) with eligibility consolidated into a discriminated union. DATABASE_URL is loaded via $env/static/private. User/auth/MFA, tournament archiving, payments, exports, printing, prize calculation, reporting, hosted deployment, and offline PWA support are still pending.
