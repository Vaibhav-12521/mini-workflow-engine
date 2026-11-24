import { priorityMeta, statusMeta, type ChipTone } from '@mwe/shared';

interface ChipProps {
  icon: string;
  label: string;
  tone: ChipTone;
  /** Screen-reader prefix, e.g. "Status". */
  kind: string;
}

/** A chip always carries an icon AND text, never colour alone (accessibility rule). */
function Chip({ icon, label, tone, kind }: ChipProps) {
  return (
    <span className={`chip chip--${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{kind}: </span>
      {label}
    </span>
  );
}

// Labels, icons and tones come from the shared definition, so a new status needs no change here.
export function StatusChip({ value }: { value: string }) {
  const m = statusMeta(value);
  return <Chip kind="Status" icon={m?.icon ?? '?'} label={m?.label ?? value} tone={m?.tone ?? 'neutral'} />;
}

export function PriorityChip({ value }: { value: string }) {
  const m = priorityMeta(value);
  return <Chip kind="Priority" icon={m?.icon ?? '?'} label={m?.label ?? value} tone={m?.tone ?? 'neutral'} />;
}
