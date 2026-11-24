# Demo — Mini Workflow Engine

Demo video: **<add your 3–5 min video link here>**

Screenshots were captured by a scripted headless-browser run against `npm run dev` with seeded data (order: main flow → failure cases → design decisions).

| # | Screenshot | What it shows |
|---|---|---|
| 1 | [01-task-list.png](01-task-list.png) | S-01: seeded tasks, status/priority chips with icon + text, default sort "Last updated ↓", pagination (12 tasks, 10 per page) |
| 2 | [02-filtered-list.png](02-filtered-list.png) | Status filter = In progress, applied in SQL; summary line with result count; Clear filters enabled |
| 3 | [03-empty-filtered.png](03-empty-filtered.png) | Empty state when filters + search match nothing, with a Clear action |
| 4 | [04-form-validation.png](04-form-validation.png) | S-02 create: submitting empty shows inline "Title is required" (same zod schema as the API) and focuses the field |
| 5 | [05-detail-created.png](05-detail-created.png) | S-03 after create: "Task created" banner, status starts To do, history has a "Created" entry |
| 6 | [06-status-changed.png](06-status-changed.png) | One status control: new status shown right away, "Status updated to In progress", timeline gets "To do → In progress" |
| 7 | [07-edit-form.png](07-edit-form.png) | The same TaskForm reused for edit (status field visible in edit mode) |
| 8 | [08-detail-history.png](08-detail-history.png) | One activity row per changed field: Title old → new, Priority High → Medium; oldest first |
| 9 | [09-delete-confirm.png](09-delete-confirm.png) | S-04: native modal dialog (focus trap, Esc closes), says history is kept |
| 10 | [10-after-delete.png](10-after-delete.png) | Back on the list with a "Task … deleted" banner |
| 11 | [11-not-found.png](11-not-found.png) | S-05: unknown task id → API 404 → friendly Not found page |
| 12 | [12-detail-dark.png](12-detail-dark.png) | Dark theme from the same tokens (OS preference) |
| 13 | [13-list-mobile.png](13-list-mobile.png) | 390px mobile: table rows become cards, filters stack |

## Suggested video script (3–5 min)

1. **Setup (30 s):** `npm install` → `npm run db:seed` → `npm run dev` → `npm test` (27 passing).
2. **Main flow (90 s):** list → filter + search → create (show validation first) → change status → edit two fields → show the timeline.
3. **Failure cases (60 s):** open `/tasks/<random-uuid>` → Not found. Open the same task in two tabs, change status in one, then in the other → 409 conflict banner with Reload. Show test T15–T17 (rollback with a failing trigger).
4. **Persistence (20 s):** refresh the page, then stop and restart `npm run dev`: data is still there (`./data/pgdata`).
5. **Design decision (40 s):** open `shared/src/domain.ts` and add the `blocked` line → `npm run db:migrate` → Blocked appears in filters, chips and validation with no other edits.
