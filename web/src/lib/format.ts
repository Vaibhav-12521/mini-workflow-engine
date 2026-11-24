import { priorityMeta, statusMeta } from '@mwe/shared';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "2 hours ago", "yesterday", "just now". */
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

/** Human label for any stored value of a field (status / priority codes → labels). */
export function fieldValueLabel(field: string | null, value: string | null): string {
  if (value === null || value === '') return '(empty)';
  if (field === 'status') return statusMeta(value)?.label ?? value;
  if (field === 'priority') return priorityMeta(value)?.label ?? value;
  return value;
}

export const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  priority: 'Priority',
  status: 'Status',
};
