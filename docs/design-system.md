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
| `--color-primary-soft` *(added)* | #e3f4f1 | #0f2e2d | Passed track stops, focus halo, count pills |
| `--color-rail-*` *(added)* | navy #14263f | #070d17 | Side rail background, text, borders, active item, teal accent |
| `--color-grid-dot` *(added)* | #d3dde6 | #17253a | Fading dot-grid texture behind page headers |
| `--font-display` *(added)* | Bricolage Grotesque | same | Page titles, numbers, panel headings (falls back to the sans stack offline) |
| `--font-mono` | JetBrains Mono, then system mono | same | Eyebrows, versions, ids, timestamps |
| `--radius-xl` *(added)* | 20px | same | Cards, tiles, dialog |
| Type scale | 12 / 14 / 16 / 20 / 28 | same | `--text-xs` … `--text-xl` |
| Spacing | 4px grid | same | `--space-1` (4) … `--space-8` (32) |
| Radius | 4 / 8 / 12 | same | inputs and buttons 8, cards 12, chips pill |
| Motion | 120 / 200 ms | same | 0 ms under `prefers-reduced-motion` |

Theme follows the OS (`prefers-color-scheme`) by default. The switch in the rail/top bar cycles Auto → Light → Dark; an explicit choice sets `html[data-theme]`, is remembered in `localStorage` (wrapped in try/catch), and is applied before first paint by a tiny inline script.

## Components

| Name | Purpose | Variants | States | Props |
|---|---|---|---|---|
| `Button` (`ui.tsx`) | All actions | primary, secondary, danger, ghost, icon | default, hover, focus, disabled, loading (spinner + `aria-busy`) | `variant`, `loading`, native button props |
| `StatusChip` / `PriorityChip` (`Chip.tsx`) | Show a status or priority | tone from definition: neutral, info, success, warning, danger | — | `value` |
| `TaskForm` | **The** create and edit form, with a live preview panel | `mode: create \| edit` (status field only in edit) | default, validation error (inline, `aria-invalid`, `aria-describedby`), saving, server error / conflict banner | `mode`, `initial`, `onSubmit`, `onCancel` |
| `Sidebar` / `TopBar` (`Shell.tsx`) | App navigation, live workflow counts, theme switch | rail at 1024px and up, top bar below | active item, loading counts (`·`) | — |
| `StatusTrack` | Status control on the detail page: one stop per status, in workflow order | passed, current, ahead (tone from definition) | hover, focus, disabled while saving; `aria-pressed` on the current stop | `value`, `onSelect`, `disabled` |
| `MiniTrack` | Read-only progress dots in list rows and the preview | — | — | `value` |
| Status tiles (list page) | Count per status; click to filter | one per status + All | active (`aria-pressed`), hover | — |
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
| S-03 Detail | Spinner; workflow track disabled with "Saving…" while saving | "No activity yet" | Error card; conflict banner with Reload | "Status updated to Done" banner; chip updates immediately |
| S-04 Dialog | "Deleting…" | — | Error banner inside dialog | Returns to list with banner |
| S-05 Not found | — | — | Message + Back to list | — |

## Layout

- **Shell:** a 272px navy side rail (brand, New task, All tasks, the workflow pipeline with counts and a bar per status, shortcuts, theme) next to a fluid workspace up to 1560px wide. Below 1024px the rail becomes a sticky top bar.
- **List:** header, then status overview tiles (auto-fit grid), then the filter bar (search + 3 controls in one row on wide screens), then task rows. Each row has a status-coloured left edge.
- **Detail (1100px and up):** two columns, task + workflow track on the left, activity in a sticky panel on the right. It stacks below that width.
- **Form (1000px and up):** form on the left, sticky live preview and "Good to know" notes on the right.
- **760px and below:** tiles become a horizontal snap-scroll strip, filters go on two columns, table rows become cards (title, then status + priority, then time), form and dialog buttons go full width. Padding is fluid (`clamp()`). No horizontal page scroll at 390px (checked by script).

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
- `prefers-reduced-motion` disables spinners, shimmer, banner/dialog entrance and hover lifts.
- The workflow track uses real `<button>`s in a `role=group` with `aria-pressed`. Each stop has its icon and label, so status is never shown by colour alone.
- Keyboard shortcuts: `/` focuses search, `N` opens the new-task form (ignored while typing or while the dialog is open).

## Screens

| Screen | Desktop | Mobile / dark |
|---|---|---|
| Task list | [01](demo/01-task-list.png), [02 filtered](demo/02-filtered-list.png), [03 empty](demo/03-empty-filtered.png) | [13 mobile](demo/13-list-mobile.png), [14 dark](demo/14-list-dark.png), [16 tablet](demo/16-list-tablet.png) |
| Task form | [04 validation](demo/04-form-validation.png), [07 edit](demo/07-edit-form.png) | — |
| Task detail | [05](demo/05-detail-created.png), [06 status](demo/06-status-changed.png), [08 history](demo/08-detail-history.png), [17 1920px](demo/17-detail-wide.png) | [12 dark](demo/12-detail-dark.png), [15 mobile](demo/15-detail-mobile.png) |
| Delete confirm | [09](demo/09-delete-confirm.png) | — |
| Not found | [11](demo/11-not-found.png) | — |
