# Design System — Mini Workflow Engine

Built on the shared tokens from the assignment repo (`shared/design-system/tokens.css`), copied to `web/src/styles/tokens.css` and extended at the bottom of that file. Components use only `var(--…)` tokens, with no hard-coded colours or sizes. The one exception is the dialog backdrop's translucent overlay.

## Principles

1. **Clarity over polish.** Every screen answers "what is happening?" with a loading, empty, success or error state.
2. **Never colour alone.** Chips carry an icon and text, and history diffs use strike-through plus bold.
3. **Deliberate destruction.** Delete always goes through a modal confirm.
4. **One source of truth.** Option lists, labels, icons and chip tones come from `shared/src/domain.ts`.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | #ffffff | #0e1726 | Cards, inputs |
| `--color-surface` | #eef3f7 | #16233a | Page background |
| `--color-border` | #d5dee6 | #2a3a55 | Borders, dividers |
| `--color-text` | #14263f | #e8eef6 | Body text |
| `--color-text-muted` | #5b6b7d | #9fb0c4 | Secondary text, timestamps |
| `--color-primary` | #0e9384 | #2dc4b2 | Primary buttons, links, timeline dots |
| `--color-danger` | #b42318 | #ff7b72 | Delete, errors, High priority |
| `--color-danger-contrast` *(added)* | #ffffff | #2a0a08 | Text on danger buttons (keeps ≥ 4.5:1 in dark) |
| `--color-success` | #1a7f4b | #4cc38a | Done chip, success banner |
| `--color-warning` | #b26a00 | #f0b35a | Medium priority chip |
| `--color-info` *(added)* | #1d5fbf | #7fb2ff | In progress chip |
| `--chip-*-bg` *(added)* | tinted | tinted | Chip and banner backgrounds per tone |
| `--color-focus` | #1d6fe0 | #6aa8ff | 2px focus ring |
| Type scale | 12 / 14 / 16 / 20 / 28 | same | `--text-xs` … `--text-xl` |
| Spacing | 4px grid | same | `--space-1` (4) … `--space-8` (32) |
| Radius | 4 / 8 / 12 | same | inputs and buttons 8, cards 12, chips pill |
| Motion | 120 / 200 ms | same | 0 ms under `prefers-reduced-motion` |

Theme follows the OS (`prefers-color-scheme`).

## Components

| Name | Purpose | Variants | States | Props |
|---|---|---|---|---|
| `Button` (`ui.tsx`) | All actions | primary, secondary, danger, ghost, icon | default, hover, focus, disabled, loading (spinner + `aria-busy`) | `variant`, `loading`, native button props |
| `StatusChip` / `PriorityChip` (`Chip.tsx`) | Show a status or priority | tone from definition: neutral, info, success, warning, danger | — | `value` |
| `TaskForm` | **The** create and edit form | `mode: create \| edit` (status field only in edit) | default, validation error (inline, `aria-invalid`, `aria-describedby`), saving, server error / conflict banner | `mode`, `initial`, `onSubmit`, `onCancel` |
| `FilterBar` | Search, status, priority, sort, clear in one row | — | Clear disabled when no filter; search debounced 300 ms | `filters`, `onChange`, `onClear` |
| `Pagination` | Prev/Next + "Page x of y · n tasks" | — | buttons disabled at ends | `page`, `totalPages`, `total`, `onPage` |
| `ActivityTimeline` | History, oldest first | item per action: created, edited, status_changed, deleted | empty ("No activity yet") | `items` |
| `ConfirmDialog` | Destructive confirmation | destructive | default, deleting (loading), error | `open`, `title`, `confirmLabel`, `busy`, `error`, `onConfirm`, `onCancel` |
| `Loading`, `SkeletonRows`, `EmptyState`, `ErrorState`, `Banner` | Page states | banner: success, error, info | error has **Try again**; banner dismissible; `role=status` / `role=alert` | — |

## States per screen

| Screen | Loading | Empty | Error | Success |
|---|---|---|---|---|
| S-01 List | Skeleton rows; dimmed table while refreshing | "No tasks yet" + New task, or "No tasks match these filters" + Clear | Error card + Try again | "Task … deleted" banner |
| S-02 Form | "Saving…" button spinner | — | Inline field errors; banner for server or conflict errors | Navigates to detail with "Task created" / "Changes saved" |
| S-03 Detail | Spinner; status select disabled while saving | "No activity yet" | Error card; conflict banner with Reload | "Status updated to Done" banner; chip updates immediately |
| S-04 Dialog | "Deleting…" | — | Error banner inside dialog | Returns to list with banner |
| S-05 Not found | — | — | Message + Back to list | — |

## Layout

- Single centred column, max width 1040px, 16px gutters on mobile.
- Breakpoint at 640px: filters stack, table rows become cards (title full width, chips and time below), form fields stack, detail header stacks.

## Content

- Plain, calm tone. Errors say what happened and what to do next ("Someone else changed this task. Reload to see the latest version, then try again.").
- Labels come from the shared definition ("To do", "In progress", "Done"). Codes are never shown to users.
- Times are relative ("2 hours ago"), with the full date on hover (`title`) and machine-readable `<time dateTime>`.

## Accessibility

- Body text contrast ≥ 4.5:1 in both themes. Danger buttons use a dark label in dark mode for this reason.
- Visible 2px focus ring (`--color-focus`) on every interactive element. Skip link to main content.
- Keyboard: the whole app works with Tab, Enter and Space. Selects are native. The dialog is a native `<dialog>` with `showModal()`, which traps focus and closes on **Esc**. Focus starts on **Cancel** (the safe choice).
- Forms: every input has a `<label>`. Errors are linked with `aria-describedby`, and on submit the first invalid field gets focus.
- Live regions: banners use `role=status` or `role=alert`, and the filter summary is `aria-live=polite`.
- Chips include a visually hidden "Status:" / "Priority:" prefix for screen readers.
- `prefers-reduced-motion` disables spinners, shimmer and transitions.

## Screens

| Screen | Desktop | Mobile / dark |
|---|---|---|
| Task list | [01](demo/01-task-list.png), [02 filtered](demo/02-filtered-list.png), [03 empty](demo/03-empty-filtered.png) | [13 mobile](demo/13-list-mobile.png) |
| Task form | [04 validation](demo/04-form-validation.png), [07 edit](demo/07-edit-form.png) | — |
| Task detail | [05](demo/05-detail-created.png), [06 status](demo/06-status-changed.png), [08 history](demo/08-detail-history.png) | [12 dark](demo/12-detail-dark.png) |
| Delete confirm | [09](demo/09-delete-confirm.png) | — |
| Not found | [11](demo/11-not-found.png) | — |
