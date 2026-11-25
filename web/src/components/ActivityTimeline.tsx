import type { Activity } from '@mwe/shared';
import { FIELD_LABELS, fieldValueLabel, fullDate, timeAgo } from '../lib/format';

const ACTION_LABELS: Record<Activity['action'], string> = {
  created: 'Created',
  edited: 'Edited',
  status_changed: 'Status changed',
  deleted: 'Deleted',
};

const ACTION_GLYPHS: Record<Activity['action'], string> = {
  created: '+',
  edited: '✎',
  status_changed: '⇄',
  deleted: '×',
};

const short = (s: string) => (s.length > 80 ? `${s.slice(0, 80)}…` : s);

function describe(a: Activity) {
  if (a.action === 'created') return <>Task created: “{short(a.newValue ?? '')}”</>;
  if (a.action === 'deleted') return <>Task deleted</>;
  const field = a.field ?? '';
  return (
    <>
      {a.action === 'edited' && <strong>{FIELD_LABELS[field] ?? field}: </strong>}
      <span className="diff diff--old">{short(fieldValueLabel(field, a.oldValue))}</span>
      <span aria-label="changed to"> → </span>
      <span className="diff diff--new">{short(fieldValueLabel(field, a.newValue))}</span>
    </>
  );
}

/** History in time order, oldest first (documented assumption). */
export function ActivityTimeline({ items }: { items: Activity[] }) {
  if (items.length === 0) return <p className="muted">No activity yet.</p>;
  return (
    <ol className="timeline">
      {items.map((a) => (
        <li key={a.id} className={`timeline__item timeline__item--${a.action}`}>
          <span className="timeline__dot" aria-hidden="true">
            {ACTION_GLYPHS[a.action]}
          </span>
          <div className="timeline__content">
            <p className="timeline__head">
              <span className="timeline__action">{ACTION_LABELS[a.action]}</span>
              <time className="timeline__time" dateTime={a.createdAt} title={fullDate(a.createdAt)}>
                {timeAgo(a.createdAt)}
              </time>
            </p>
            <p className="timeline__detail">{describe(a)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
