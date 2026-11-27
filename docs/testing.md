# Testing

**Run everything:** `npm test` (Vitest + Supertest; about 7 s).
Each test file spins up a fresh **in-memory PostgreSQL** (PGlite) with the real `db/schema.sql`, then calls the real Express app over HTTP. There are no mocks of the database, so constraints, foreign keys, triggers and `FOR UPDATE` all behave as in production.

Result at submission: **27 passed** (3 files). `tsc` passes for shared, server and web.

| Test ID | Scenario | Type | Steps | Expected | File |
|---|---|---|---|---|---|
| T01 | Create happy path (US-01) | integration | POST with padded title + priority | 201, trimmed title, status `todo`, version 1, `created` activity | `server/tests/tasks.api.test.ts` |
| T02 | Title required | integration | POST `title: "   "` | 422 `VALIDATION_FAILED`, detail `{path:"title"}` | same |
| T03 | Invalid status/priority/extra key | integration | POST `status:"archived", priority:"urgent", owner` | 422 listing status and priority | same |
| T04 | Malformed JSON | integration | POST broken JSON | 400 `BAD_REQUEST`, standard shape | same |
| T05 | Edit records old → new per field (US-02) | integration | PATCH title + priority (+ unchanged description) | 200, version 2, `updatedAt` > `createdAt`; 2 `edited` rows, none for unchanged description | same |
| T06 | Status change (US-03) | integration | PATCH status | `status_changed todo → in_progress` | same |
| T07 | Invalid status on update | integration | PATCH `status:"finished"` | 422; task unchanged | same |
| T08 | No-op update | integration | PATCH same title | version stays 1, no new activity | same |
| T09 ×4 | Unknown / malformed id (US-05) | integration | GET, PATCH, DELETE, GET activities on a missing UUID and on `not-a-uuid` | 404 `NOT_FOUND`, standard shape | same |
| T10 | Delete (US-04) | integration | DELETE, then GET, DELETE again, list | 204, then 404, 404; history in DB = created, deleted; list total 0 | same |
| T11 | Stale version | integration | Two sequential PATCHes with `version:1` | Second → 409 with expected/current version; first write kept | same |
| T12 | Near-simultaneous updates (F-16) | integration | Two parallel PATCHes with same version | Exactly one 200 and one 409; exactly one `status_changed` row | same |
| T13 | One shared definition (C2) | integration | Read `task_statuses` | Equals `STATUSES` from `shared/src/domain.ts` | same |
| T14 | DB rejects bad status | integration | Raw SQL insert `status='archived'` | FK violation | same |
| T15 | Rollback on create (US-10) | integration | Trigger makes activity insert fail → POST | 500 `INTERNAL`, no SQL leaked, **0 task rows** | `server/tests/transactions.test.ts` |
| T16 | Rollback on update (US-10) | integration | Trigger → PATCH title + status | 500; task title, status and version unchanged | same |
| T17 | Rollback on delete (US-10) | integration | Trigger → DELETE | 500; task still live (GET 200) | same |
| T18 | Filters (US-06) | integration | `?status`, `?priority`, both | Correct rows only | `server/tests/list.test.ts` |
| T19 | Search + filters (US-07) | integration | `?q=BUG`, `?q=bug&priority=high&status=todo` | Case-insensitive match on title OR description, combined with filters | same |
| T20 | Literal wildcard search | integration | `?q=50%`, `?q=%` | Only the task containing "50%" | same |
| T21 | Pagination | integration | `pageSize=2` pages 1-3 | total 5, totalPages 3, no overlap | same |
| T22 | Sort by priority rank | integration | `sort=priority&order=asc` | low, medium, medium, high, high | same |
| T23 | Bad query params | integration | unknown status, pageSize 500, sort=password, page 0 | 422 each | same |
| T24 | Empty filters ignored | integration | `status=&priority=&q=` | All 5 tasks | same |

## How the rollback tests prove atomicity

`transactions.test.ts` creates a PL/pgSQL trigger `BEFORE INSERT ON task_activities` that always raises. The service writes the task **first** and the activity **second**, so if the two writes weren't in one transaction, the task change would survive.
As a check on the tests themselves, I temporarily replaced `db.transaction(...)` in `taskService.ts` with direct calls. T15, T16 and T17 all **failed** as expected, then passed again once the code was restored.

## Engineering scenarios coverage

| Scenario (brief section D) | Handled | Tested |
|---|---|---|
| Update of a non-existent task | Yes, 404 | T09 |
| Task update + activity commit together | Yes, one transaction | T15-T17 |
| Filtering/sorting/pagination in the DB | Yes, SQL | T18-T24 |
| Status/priority validation | Yes, zod + FK, one definition | T03, T07, T13, T14, T23 |
| Two near-simultaneous updates | Yes, `FOR UPDATE` + version → 409 | T11, T12 |
| Which operations need transactions / failure tests | Yes, create, update, delete | T15-T17 |

## Not tested (and why)

- **UI component tests / e2e:** visual polish is secondary in this brief, and the time went into API and DB correctness. The UI was checked by scripted headless-browser runs through every screen (screenshots in `docs/demo/`). Playwright e2e is listed as future work.
- **`pg` (DATABASE_URL) adapter:** same SQL, but no test runs against an external Postgres server, because that would need a DB install on the reviewer's machine. Only the transaction wrapper differs (`BEGIN/COMMIT/ROLLBACK` on a pooled client).
- **Load and performance:** out of scope.
