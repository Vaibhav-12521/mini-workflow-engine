# Diagrams

Mermaid is the source of truth (per SUBMISSION_FORMATS Section 11). Each diagram is embedded in its doc, which GitHub renders, and also kept here as a standalone `.mmd` file.

| File | Diagram | Used in |
|---|---|---|
| `system-flow.mmd` | System interaction flow | [hld.md](../hld.md) |
| `seq-update.mmd` | Update task (lock, version check, activity) | [hld.md](../hld.md) |
| `seq-create.mmd` | Create task | [hld.md](../hld.md) |
| `seq-list.mmd` | List with filters | [hld.md](../hld.md) |
| `er-diagram.mmd` | ER diagram | [database.md](../database.md) |

Export to SVG: `npx -y @mermaid-js/mermaid-cli -i docs/diagrams/er-diagram.mmd -o docs/diagrams/er-diagram.svg`
