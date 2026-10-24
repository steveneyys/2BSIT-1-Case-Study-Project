# Team Working Agreement, Definition of Done and Role Guide (S1-SM-03)

## 1. Working agreement

| Area | Agreement |
|---|---|
| Branches | Nobody pushes to `main`. |
| Commits | Short, clear messages. |
| Pull requests | One task per PR, with the template filled in. Keep it small. |
| Reviews | Review within 24 hours. Approve or request changes with specific comments. |
| Merging | Merge only after approval and passing tests. The author merges. |
| Conflicts | Discuss in the team chat first. If unresolved, the Scrum Master decides on process matters and the team votes on technical ones. |
| Blockers | Raise them the same day. Waiting silently is not allowed. |
| Workload | Help a teammate who is behind rather than waiting for the deadline. |

## 2. Definition of Done

A task is **Done** only when all of these are true:

| # | Criterion |
|---|---|
| 1 | The code is merged to `main` through a PR linked to an issue. |
| 2 | At least one teammate (not the author) approved it. |
| 3 | Every acceptance criterion on the story is met. |
| 4 | It was tested manually, and automated tests were added or updated where applicable. |
| 5 | It builds and runs from a fresh clone. |
| 6 | There are no secrets, credentials or debug leftovers in the code. |
| 7 | Permission checks are enforced on the server, not only hidden in the UI. |
| 8 | The docs are updated if setup or behavior changed. |
| 9 | Story and accepted criteria in `Script-board.md`
| 10 | Marks the card Done and the PR link is in the task plan. |

## 3. Role guide

| Role | Owns | Hands off to |
|---|---|---|
| Scrum Master | Board, ceremonies, impediments, working agreement, reports | Everyone: unblocks them |
| Developer | App code (screens, APIs, auth, rights checks) | Tester, with test notes in each PR |
| DB Admin | Migrations, seed data, audit functions, queries | Developer, who consumes the schema |
| Tester | Test plan and cases, bug reports, smoke tests | Developer, with bugs and verification |
| UI/UX Designer | Design system, wireframes, mockups, usability review | Developer, with handoff notes |
