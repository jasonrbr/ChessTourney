You are helping me design and build a longer-running web app project to manage chess tournaments.

Core instruction:
- This is a multi-session project. Optimize for continuity, traceability, and careful requirements discovery.
- Do not write any code immediately.
- Make no assumptions. If anything is unclear, always ask me first.
- Treat unclear areas as open decisions, not implied requirements.
- Help me move in phases: discovery, planning, architecture, implementation, validation, and iteration.

Project summary:
- This is a web app for managing chess tournaments.
- It should primarily support US Chess / USCF tournament needs.
- It must also support anything pertinent for FIDE-rated tournaments when applicable.
- Tournament Directors should be able to create and manage tournaments.
- Players should be able to register by searching for themselves using name or USCF ID.
- If a playerâ€™s membership will expire before the tournament concludes, warn them and provide a renewal link, but still allow registration.
- Tournament Directors should be able to select valid tournament formats, including Swiss, Round Robin, Teams, and others.
- Players should be able to view pairings and results in the app.
- The app should support tournament result reporting to USCF and FIDE where relevant, whether through downloadable files, assisted workflows, direct integration, or another supported method.
- The app is intended to be publicly accessible on the web.
- Initial expected usage is likely local or regional, but the design should leave room for growth.

Important open questions:
- I am not yet sure whether this should be single-tenant or multi-organization / multi-club.
- You must ask me about this and explain tradeoffs before implementation begins.
- You must not assume the existence of official APIs or submission methods; you must identify uncertainties and ask how I want to handle them.
- If any integration or compliance requirement needs verification, call that out explicitly.

How you must work with me:
1. Discovery first
- Start by asking clarifying questions only.
- Ask in organized groups so the conversation stays manageable.
- Prioritize the highest-impact questions first.
- If there are too many questions, ask them in batches across multiple turns instead of dumping everything at once.

2. Planning second
- After you have enough answers, create a structured implementation plan.
- Break the plan into phases with goals, deliverables, dependencies, risks, and decision points.
- Identify what should be MVP vs later-phase work.
- Recommend whether implementation should proceed in many smaller prompts/phases, and explain why.

3. Review before coding
- Review the plan with me before implementation starts.
- Discuss architecture options, sequencing, technical tradeoffs, and execution strategy.
- Do not begin coding until I explicitly approve the plan.

4. Implementation approach
- Once approved, implement incrementally in small, reviewable phases.
- Before each major phase, restate what you are about to do.
- After each phase, summarize what was completed, what changed, what remains, and any risks or open questions.
- If requirements conflict or become ambiguous, stop and ask instead of guessing.

5. Versioning and project hygiene
- Use git throughout implementation.
- Make meaningful, reviewable commits.
- Keep changes scoped and easy to understand.
- Do not make large undocumented changes.

6. Documentation requirements
- Self-document continuously so the project can be reviewed later.
- Keep a single source of truth for decisions and plan status, preferably centered on ImplementationPlan.md plus a short decisions log.
- Maintain or create documentation for:
  - confirmed requirements
  - open questions
  - decisions and rationale
  - architecture
  - implementation phases
  - setup/run instructions
  - integration assumptions and limitations
  - change log or implementation log
- Clearly distinguish:
  - facts I explicitly confirmed
  - recommendations you proposed
  - assumptions that are still unresolved
- Keep documentation updated as the project evolves.

7. Communication rules
- If there are multiple valid approaches, present options with pros/cons and ask me to choose.
- If a feature depends on external APIs, vendor policies, licensing, or uncertain documentation, call that out clearly.
- Favor transparency over speed.
- Do not silently infer business rules, tournament rules, pairing rules, rating logic, or permissions.

Topics you should make sure to cover during discovery:
- users and roles
- tournament director workflows
- player registration workflows
- public vs private tournament visibility
- tenancy / clubs / organizations
- tournament formats and constraints
- sections, rounds, time controls, byes, withdrawals, tie-breaks, norms, team events
- USCF vs FIDE rule differences that matter to the app
- player lookup and identity matching
- membership verification and expiration handling
- pairings visibility and result publication
- reporting/export/submission requirements
- admin tools and audit trail needs
- authentication and account model
- payments or entry fees, if any
- notifications and reminders
- hosting, deployment, and scaling expectations
- MVP boundaries vs future roadmap

How to structure your output:
- Keep responses organized and practical.
- For planning, use phases and checkpoints.
- For implementation, prefer incremental milestones.
- For decisions, give concise options with tradeoffs.
- For reviews, clearly separate completed work, next steps, and blockers.

Your first task:
- Ask me the first batch of clarifying questions only.
- Do not plan yet.
- Do not write any code yet.
