# Mini Workflow Engine

A small task app. You create tasks, move them through statuses, and every change is kept in a history log for that task.
A task change and its history rows are written in one database transaction, so a change can never be saved without its history.
Assignment 03 of the Anshumat / OnRole full-stack screen. TypeScript end to end, PostgreSQL SQL, React UI.

- Repository: https://github.com/Vaibhav-12521/mini-workflow-engine
- Demo video: see [docs/demo/README.md](docs/demo/README.md)
- Screenshots of every screen (light, dark, tablet, mobile): [docs/demo/](docs/demo/README.md)

## My approach

1. Read the brief, rubric and submission guide first, and turned the six depth-check questions into design rules before writing code.
2. Defined statuses and priorities in one place (`shared/src/domain.ts`). API validation, UI dropdowns and the database lookup tables all come from it, so a new status is a one-line change.
3. Built the backend in layers (routes, service, repositories). Every write and its history rows go through one transaction.
4. Wrote tests for the risky parts first: rollback, 404s, validation, two parallel updates, and filtering in SQL.
5. Built the React UI with one shared form and a clear loading, empty, error and success state on every screen, then checked it on desktop, tablet, mobile and in dark mode.
6. Wrote the docs the submission guide asks for and listed assumptions, trade-offs and limits below.

## Quick start

You need Node.js 20+ and npm. No Docker and no database install (see the Database section below).

```bash
git clone https://github.com/Vaibhav-12521/mini-workflow-engine.git
cd mini-workflow-engine
npm install
npm run db:seed
npm run dev
npm test
```

Open http://localhost:5173 for the UI. The API runs on http://localhost:4000/api. Copying `.env.example` to `.env` is optional, the defaults work without it.

| Command | What it does |
|---|---|
| `npm install` | Installs all three workspaces (shared, server, web) |
| `npm run dev` | Starts the API (tsx watch) and the Vite UI together |
| `npm run db:migrate` | Applies `db/schema.sql` and syncs status/priority lookup tables from the shared definition |
| `npm run db:seed` | Migrate + `db/seed.sql`, loads 12 synthetic tasks (safe to re-run; skipped when `SEED_ENABLED=false`) |
| `npm run db:reset` | Drops all tables, migrates, re-seeds. Stop `npm run dev` first (the embedded DB is single-process) |
| `npm test` | Runs all 27 tests (Vitest + Supertest) against a fresh in-memory PostgreSQL |
| `npm run build` | Production build of the UI |
| `npm run typecheck` | `tsc` over shared, server and web |

If port 5173 is busy, Vite picks the next free port and prints it.

### Database

The SQL is plain PostgreSQL. By default it runs on [PGlite](https://pglite.dev), which is real PostgreSQL compiled to WebAssembly and running inside the Node process, with data stored in `./data/pgdata`.
So a clean clone runs with `npm install`, and the tests use a fresh in-memory Postgres each run.

To use a normal PostgreSQL server instead, set `DATABASE_URL=postgres://user:pass@localhost:5432/workflow` in `.env`. Only the connection changes (`server/src/db/client.ts`). Schema, queries and tests stay the same.

## Repository layout

```text
shared/src/domain.ts      ← statuses, priorities, page size, sort fields (defined only here)
shared/src/schemas.ts     ← zod request schemas + response types, used by both the API and the web form
db/schema.sql, seed.sql   ← tables, constraints, indexes; synthetic seed data
server/src/
  routes/tasks.ts         ← HTTP layer: validate input, call service, shape response
  services/taskService.ts ← business rules: transactions, optimistic locking, activity diffing
  repositories/*.ts       ← data access: parameterised SQL only
  db/client.ts            ← PGlite / pg adapter with transaction()
  http/errors.ts          ← one error class → one error shape
server/tests/             ← 27 tests (API, transactions/rollback, list/filter/search)
web/src/
  components/             ← TaskForm (create + edit), Shell (sidebar, top bar), StatusTrack, Chip,
                            FilterBar, Pagination, ConfirmDialog, ActivityTimeline, ui.tsx
  pages/                  ← List, Create/Edit, Detail, NotFound
  api/client.ts           ← typed fetch client
  lib/                    ← useAsync (loading/ready/error), status counts, theme, formatting
docs/                     ← HLD, database, API, design system, testing, sitemap, demo screenshots
```

## What the UI does

- Task list with status tabs (with counts), search, status and priority filters, sort and pagination. Filters live in the URL, so a filtered view survives a refresh.
- Create and edit with the same form, inline validation from the same zod schema as the API, and a small preview of how the task will look in the list.
- Task page with a status control (one button per status, in workflow order), Edit, Delete with a confirmation dialog, and the full history with old and new values.
- Clear messages for every case: loading, empty, no results, saved, validation errors, "someone else changed this task, reload", and not found.
- Works from 390px phones to wide screens. Light and dark theme (follows the system, or pick one). Keyboard friendly, with `/` to search and `N` for a new task.

## Architecture, data model, API

- Architecture: [docs/hld.md](docs/hld.md)
- Data model: [docs/database.md](docs/database.md) · [db/schema.sql](db/schema.sql)
- API: [docs/api.md](docs/api.md)
- Tests: [docs/testing.md](docs/testing.md)
- UI: [docs/design-system.md](docs/design-system.md) · [docs/sitemap.md](docs/sitemap.md) · [docs/demo/](docs/demo/README.md)

## Configuration decisions

| Setting | Decision |
|---|---|
| Statuses | `todo`, `in_progress`, `done`, defined once in `shared/src/domain.ts` |
| Default status on create | `todo`. The create form doesn't show status; edit and the detail page do |
| Priorities | `low`, `medium`, `high`. Default `medium` |
| Page size | 10 by default, max 50 (`?pageSize=`). Offset pagination with `total` and `totalPages` |
| Default sort | `updated_at DESC`, tie-break on `id`. Also sortable by `created_at`, `title`, `priority` (by rank Low < Medium < High) and `status` (workflow order) |
| Search fields | Title or description, case-insensitive substring (`ILIKE`). `%` and `_` are matched literally |
| Activity order | Oldest to newest. Rows from the same edit keep their insert order (`seq` column) |
| Error shape | `{ "error": { "code", "message", "details" } }` for every 4xx/5xx |
| Concurrent update rule | Optimistic locking: PATCH must send the `version` it read. Stale version → `409 CONFLICT` |
| Delete | Soft delete (`deleted_at`). The task disappears from the API (404), its history stays in the DB |
| Actor ID | Column exists (`actor_id`), always `NULL`. No auth is in scope |

## Engineering depth checks

**1. What happens when a client updates a task that does not exist?**
`PATCH /api/tasks/:id` returns 404 `{ "error": { "code": "NOT_FOUND", "message": "Task not found", "details": [] } }`.
The service loads the row with `SELECT … FOR UPDATE` inside the transaction. If there is no live row (never existed, or soft-deleted), it throws `notFound()` and the transaction rolls back with nothing written.
A malformed id such as `/tasks/abc` also returns 404, not a raw Postgres cast error, because it can never match a task. Covered by test T09 for GET, PATCH, DELETE and activities.

**2. How do you ensure the task update and the activity record commit together?**
Every write goes through `db.transaction(async (tx) => { … })` in `taskService.ts`. The task `INSERT`/`UPDATE` and the `task_activities` `INSERT`s use the same `tx`, so they share one `BEGIN … COMMIT`. Any error inside triggers `ROLLBACK`.
Repositories accept a `Queryable` and never open their own connection, so a write cannot escape the transaction by accident.

**3. Where should filtering, sorting and pagination happen, and why?**
In the database (`taskRepository.list`). `WHERE` (status, priority, `ILIKE` search), `ORDER BY` and `LIMIT/OFFSET` all run in SQL, plus a `count(*)` for the total.
Filtering in memory would mean loading every row on each request: memory and latency grow with the table and indexes can't help. Pagination totals would also be wrong unless you load everything.
The sort column comes from a whitelist map (`SORT_SQL`), so the client chooses a key and never sends SQL. Partial indexes on `(status, updated_at)`, `(priority, updated_at)` and `(updated_at)` serve these queries.

**4. How do you validate status and priority values?**
At three layers, all taken from one definition (`STATUSES` / `PRIORITIES` in `shared/src/domain.ts`):
1. API: zod `z.enum(STATUS_VALUES)` in `shared/src/schemas.ts`. Unknown values → `422 VALIDATION_FAILED` with a per-field message. Unknown body keys are also rejected (`strictObject`).
2. UI: the same zod schema drives inline form validation, and dropdowns render from the same array.
3. Database: `tasks.status` and `tasks.priority` are foreign keys to the `task_statuses` / `task_priorities` lookup tables. `migrate.ts` upserts those rows from the shared definition, so even a raw `INSERT` with a bad value fails (test T14).
Nothing repeats the allowed values by hand. Adding Blocked is one line in `domain.ts` followed by `npm run db:migrate`.

**5. What if two users update the same task at nearly the same time?**
Optimistic concurrency with a row lock:
- Every task has a `version` that is incremented on each update. `PATCH` must include the `version` the client last saw.
- Inside the transaction the row is read `FOR UPDATE`, so a second concurrent request waits until the first commits.
- If `version` doesn't match the current row, the API returns 409 CONFLICT with `expectedVersion`, `currentVersion` and the current task. The UI says *"Someone else changed this task… Reload"*.
- So there are no lost updates, no silent overwrite, and exactly one history entry per real change. Test T12 fires two parallel PATCHes with the same version and asserts one 200 and one 409.

**6. Which operations need transactions? How would you test failure cases?**
Create (task + "created" activity), update and status change (task + one activity per changed field) and delete (soft delete + "deleted" activity) all need one, because each writes to two tables. Reads don't.
Failure tests (`server/tests/transactions.test.ts`) install a real PostgreSQL trigger that raises on every insert into `task_activities`, then call the API. The task write runs first in the same transaction, so a non-transactional implementation would leave it behind. The tests assert that:
- create → 500 and no task row (T15)
- update → 500 and the task keeps its old title, status and version (T16)
- delete → 500 and the task is still live (T17)
The 500 body is the generic error shape. It contains no SQL or trigger text.

## Assumptions

- Single user role with no authentication (the brief puts auth out of scope). The team lead is the same role.
- New tasks always start in `todo`. Status can be changed on the detail page or in the edit form.
- An edit that changes several fields writes one activity row per changed field, each with old and new values. A PATCH that changes nothing writes nothing and doesn't bump `version`.
- A status change is recorded as action `status_changed`. Other field changes are `edited`.
- After a delete, all task endpoints (including `/activities`) return 404. The history is kept in the DB for audit but not exposed by the API.
- Title is required (1-200 chars after trimming). Description is optional (≤ 5000 chars).

## Trade-offs

| Decision | Gain | Cost |
|---|---|---|
| PGlite by default (real Postgres in-process), `pg` when `DATABASE_URL` is set | Clean clone runs with no DB install; tests use real Postgres semantics (FKs, triggers, `FOR UPDATE`) | Embedded DB is single-process: stop the server before `db:reset` |
| Lookup tables + FK instead of a `CHECK (status IN …)` | Values come from the one shared definition; adding a status needs no SQL edit; `rank`/`position` give meaningful sorting | Two extra tiny tables and a sync step in `migrate` |
| Soft delete | History survives delete; FK from activities stays valid | Every query must filter `deleted_at IS NULL` (handled with partial indexes) |
| Optimistic locking (`version`) | No lost updates; a clear 409 the UI can explain | Clients must send `version` on PATCH |
| Offset pagination | Simple, gives page numbers and totals as in the wireframe | Slower on very deep pages; rows can shift between pages under heavy writes |
| `ILIKE '%term%'` search | Substring matching on both fields, no extension needed | Can't use a B-tree index; fine at this scale (see Future work) |
| One field per activity row | Timeline reads naturally ("Priority: Medium → High"); simple to query | An edit of 3 fields is 3 rows |

## Limitations

- No authentication, so `actor_id` is always `NULL`.
- Search is a substring scan, not ranked full-text search.
- History of deleted tasks isn't viewable in the UI.
- No end-to-end UI tests. The UI was verified manually and with scripted screenshots in `docs/demo/`.
- Long description edits store the full old and new text in history.

## Future work

- `pg_trgm` GIN index on title and description for fast `ILIKE` at scale.
- Keyset (cursor) pagination for large lists.
- Auth, so `actor_id` is filled from the session user.
- An "Include deleted" view with restore.
- Status transition rules (e.g. Done → Todo not allowed) as a small state machine in the shared definition.
- Playwright e2e tests for the UI states.

## Things I fixed along the way

- History order: when one edit changed two fields, both history rows could get the same timestamp and then come back in random order (one test failed now and then). I added an identity `seq` column to `task_activities` and the timeline now orders by `created_at, seq`. Existing databases get the column on the next `npm run db:migrate`.
- Contrast: the Delete button label was too faint in dark mode, so I added a separate token for text on danger buttons.

## Live follow-up: adding a Blocked status

I tried this before submitting:

1. `shared/src/domain.ts`: add `{ value: 'blocked', label: 'Blocked', icon: '⊘', tone: 'danger' }` to `STATUSES`.
2. `npm run db:migrate`: the lookup row is upserted, so the FK accepts `blocked`.
3. Everything else follows automatically: API validation (zod enum), UI dropdowns, filter, chips, status tabs, sidebar counts, the status control on the task page, timeline labels, sort order, and test T13 (DB lookup = shared definition).
4. Add a test, e.g. `PATCH { status: 'blocked' }` → 200 and a `status_changed todo → blocked` activity.

With the line added, `tsc` and all 27 tests still passed. I removed it again so the submission matches the brief.

## AI usage disclosure

| Tool | Used for | What I verified myself |
|---|---|---|
| Claude (Anthropic), as a coding assistant | Scaffolding the workspace, first drafts of repository/service code, tests, CSS and these docs | Reviewed every file. Ran the full test suite and typecheck. Clicked through every screen (list, filters, create with validation, edit, status change, delete, 404, dark mode, mobile). Checked the rollback tests fail when the transaction is removed. Rehearsed the Blocked change |

Design decisions (lookup tables, soft delete, optimistic locking, one activity row per field) were chosen to match the brief's directives. I can explain each one, and they're written down above.

## Sources

- Assignment brief: `fullstack-assignment/03-mini-workflow-engine` in the Tech-Assignment repo
- PostgreSQL docs: [explicit locking / `SELECT FOR UPDATE`](https://www.postgresql.org/docs/current/explicit-locking.html), [partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- [PGlite](https://pglite.dev) · [zod](https://zod.dev) · [Express 5 error handling](https://expressjs.com/en/guide/error-handling.html)
