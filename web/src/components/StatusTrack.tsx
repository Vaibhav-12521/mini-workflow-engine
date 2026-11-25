import { STATUSES, statusMeta, type TaskStatus } from '@mwe/shared';

const indexOf = (value: string) => STATUSES.findIndex((s) => s.value === value);

/**
 * The workflow drawn as a track, one stop per status in the shared definition.
 * Stops before the current one show as passed. Any status can be picked (the brief allows any transition).
 * Adding a status to shared/src/domain.ts adds a stop here with no UI change.
 */
export function StatusTrack({
  value,
  onSelect,
  disabled,
}: {
  value: string;
  onSelect: (next: TaskStatus) => void;
  disabled?: boolean;
}) {
  const current = indexOf(value);
  return (
    <div className="track" role="group" aria-label="Change status">
      {STATUSES.map((s, i) => {
        const state = i < current ? 'passed' : i === current ? 'current' : 'ahead';
        return (
          <button
            key={s.value}
            type="button"
            className={`track__stop track__stop--${state} tone-${s.tone}`}
            aria-pressed={i === current}
            disabled={disabled}
            onClick={() => i !== current && onSelect(s.value)}
          >
            <span className="track__node" aria-hidden="true">
              {s.icon}
            </span>
            <span className="track__label">{s.label}</span>
            <span className="track__step" aria-hidden="true">
              Step {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact, read-only progress dots for list rows. */
export function MiniTrack({ value }: { value: string }) {
  const current = indexOf(value);
  const label = statusMeta(value)?.label ?? value;
  return (
    <span className="mini-track" title={`${label}: step ${current + 1} of ${STATUSES.length}`} aria-hidden="true">
      {STATUSES.map((s, i) => (
        <span key={s.value} className={`mini-track__dot ${i <= current ? 'is-on' : ''}`} />
      ))}
    </span>
  );
}
