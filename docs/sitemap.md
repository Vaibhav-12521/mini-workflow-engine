# Sitemap — Mini Workflow Engine

```text
App
├── /                      (S-01 Task list: filters in the query string ?status=&priority=&q=&sort=&order=&page=)
│   └── + New task
├── /tasks/new             (S-02 Task form, create)
├── /tasks/:id             (S-03 Task detail + activity; S-04 delete dialog opens here)
├── /tasks/:id/edit        (S-02 Task form, edit)
└── *                      (S-05 Not found; also shown for unknown task ids)
```

| Route | Screen | Role / auth | Data | States |
|---|---|---|---|---|
| `/` | Task list | user (no auth) | `GET /api/tasks` | loading, empty, filtered-empty, error, ready |
| `/tasks/new` | Task form (create) | user | `POST /api/tasks` | default, validation error, saving, error |
| `/tasks/:id` | Task detail | user | `GET /api/tasks/:id`, `GET /api/tasks/:id/activities`, `PATCH`, `DELETE` | loading, ready, error, not found, status saving/saved/conflict |
| `/tasks/:id/edit` | Task form (edit) | user | `GET /api/tasks/:id`, `PATCH /api/tasks/:id` | loading, default, validation error, saving, conflict, not found |
| `*` | Not found | user | — | ready |
