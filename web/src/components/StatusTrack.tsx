import { STATUSES, statusMeta, type TaskStatus } from '@mwe/shared';

const indexOf = (value: string) => STATUSES.findIndex((s) => s.value === value);

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
            className={`track__stop track__stop--${state}`}
            aria-pressed={i === current}
            disabled={disabled}
            onClick={() => i !== current && onSelect(s.value)}
          >
            <span className="track__node" aria-hidden="true">
              {s.icon}
            </span>
            <span className="track__label">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

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
