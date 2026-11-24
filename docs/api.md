# API — Mini Workflow Engine

Base URL: `http://localhost:4000/api` (in dev the UI calls `/api` through the Vite proxy).
JSON in, JSON out. No auth (out of scope). Field names in responses are camelCase.

## Endpoints

| Method | Path | Purpose | Auth | Idempotent |
|---|---|---|---|---|
| POST | `/tasks` | Create a task | none | No (each call creates a task) |
| GET | `/tasks` | List with filters, search, sort, pagination | none | Yes |
| GET | `/tasks/{id}` | Fetch one task | none | Yes |
| PATCH | `/tasks/{id}` | Update fields and/or status | none | Effectively yes: replaying the same body with the same `version` gets 409 after the first success, so it is never applied twice |
| DELETE | `/tasks/{id}` | Soft-delete a task | none | Yes in effect (second call → 404, no further change) |
| GET | `/tasks/{id}/activities` | Task history, oldest first | none | Yes |
| GET | `/health` | Liveness | none | Yes |

## Standard error body

Every 4xx/5xx response:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Some fields are invalid", "details": [ { "path": "status", "message": "Status must be one of: todo, in_progress, done" } ] } }
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `BAD_REQUEST` | Body isn't valid JSON |
| 404 | `NOT_FOUND` | Unknown, malformed or soft-deleted task id; unknown `/api` route |
| 409 | `CONFLICT` | PATCH `version` doesn't match the current version (`details` = `{ expectedVersion, currentVersion, current }`) |
| 422 | `VALIDATION_FAILED` | Body or query fails the schema (`details` = list of `{ path, message }`) |
| 500 | `INTERNAL` | Unexpected error. Generic message; no SQL or stack trace |

Allowed values come from `shared/src/domain.ts`: status `todo | in_progress | done`, priority `low | medium | high`.

## Task object

```json
{
  "id": "00000000-0000-4000-8000-000000000003",
  "title": "Fix pagination off-by-one on reports page",
  "description": "Last page shows an empty table…",
  "priority": "high",
  "status": "done",
  "version": 3,
  "createdAt": "2026-11-22T21:23:48.523Z",
  "updatedAt": "2026-11-23T01:23:48.523Z"
}
```

---

### POST /tasks

| Field | Content |
|---|---|
| Request | Body: `{ title: string (1–200, trimmed, required), description?: string (≤ 5000, default ""), priority?: Priority (default "medium"), status?: Status (default "todo") }`. Unknown keys are rejected |
| Response | `201` Task |
| Errors | `422` invalid or missing fields · `400` bad JSON |
| Idempotency | None (no idempotency key in scope) |
| Notes | Writes the task and a `created` activity in one transaction |

### GET /tasks

| Field | Content |
|---|---|
| Request | Query: `status?`, `priority?`, `q?` (≤ 200 chars, matches title OR description, case-insensitive, `%`/`_` literal), `page?` (≥ 1, default 1), `pageSize?` (1–50, default 10), `sort?` (`updated_at` \| `created_at` \| `title` \| `priority` \| `status`, default `updated_at`), `order?` (`asc` \| `desc`, default `desc`). Empty values are ignored |
| Response | `200` `{ data: Task[], pagination: { page, pageSize, total, totalPages } }` |
| Errors | `422` unknown filter value, page < 1, pageSize > 50, unknown sort |
| Notes | Filtering, search, sort and pagination run in SQL. Ties are broken by `id` for a stable order. `priority` sorts by rank (Low < Medium < High), `status` by workflow position. Soft-deleted tasks are never returned |

### GET /tasks/{id}

| Field | Content |
|---|---|
| Response | `200` Task |
| Errors | `404` |

### PATCH /tasks/{id}

| Field | Content |
|---|---|
| Request | Body: `{ version: int (required), title?, description?, priority?, status? }`, at least one field besides `version`. Unknown keys are rejected |
| Response | `200` updated Task (`version` + 1). If nothing actually changed, the current task is returned with no write and no history row |
| Errors | `404` unknown id · `409` stale version · `422` invalid fields or missing `version` |
| Idempotency | Optimistic version: a replayed request with an old `version` gets 409 and is never applied twice |
| Notes | One transaction: `SELECT … FOR UPDATE`, version check, `UPDATE`, then one activity row per changed field (`status_changed` for status, `edited` otherwise), each with `oldValue`/`newValue` |

### DELETE /tasks/{id}

| Field | Content |
|---|---|
| Response | `204` no body |
| Errors | `404` unknown or already deleted |
| Notes | Soft delete plus a `deleted` activity in one transaction. Later GET returns 404 |

### GET /tasks/{id}/activities

| Field | Content |
|---|---|
| Response | `200` `{ data: Activity[] }`, ordered `createdAt ASC, id ASC` |
| Errors | `404` unknown or deleted task |

Activity object:

```json
{ "id": "…", "taskId": "…", "action": "status_changed", "field": "status", "oldValue": "todo", "newValue": "in_progress", "actorId": null, "createdAt": "2026-11-24T10:00:00.000Z" }
```

`action` ∈ `created | edited | status_changed | deleted`. `field` is null for `created`/`deleted`. For `created`, `newValue` is the title; for `deleted`, `oldValue` is the title.

## Examples

```bash
curl -s -X POST localhost:4000/api/tasks -H 'content-type: application/json' \
  -d '{"title":"Plan clean-up drive","priority":"high"}'

curl -s 'localhost:4000/api/tasks?status=in_progress&q=report&page=1&pageSize=10&sort=priority&order=desc'

curl -s -X PATCH localhost:4000/api/tasks/<id> -H 'content-type: application/json' \
  -d '{"status":"done","version":1}'
```
