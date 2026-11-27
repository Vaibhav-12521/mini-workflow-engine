import { useEffect, useState } from 'react';
import { SORT_FIELDS } from '@mwe/shared';
import { Button, PriorityOptions, StatusOptions } from './ui';

export interface Filters {
  status: string;
  priority: string;
  q: string;
  sort: string;
  order: string;
}

const SORT_LABELS: Record<(typeof SORT_FIELDS)[number], string> = {
  updated_at: 'Last updated',
  created_at: 'Created',
  title: 'Title',
  priority: 'Priority',
  status: 'Status',
};

interface FilterBarProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onClear: () => void;
}

export function FilterBar({ filters, onChange, onClear }: FilterBarProps) {
  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => onChange({ q }), 300);
    return () => clearTimeout(t);
  }, [q, filters.q, onChange]);

  const active = Boolean(filters.status || filters.priority || filters.q);

  return (
    <div className="filters" role="search">
      <div className="field field--grow">
        <label htmlFor="f-q">Search</label>
        <input id="f-q" type="search" placeholder="Search title or description…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="f-status">Status</label>
        <select id="f-status" value={filters.status} onChange={(e) => onChange({ status: e.target.value })}>
          <option value="">Any</option>
          <StatusOptions />
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-priority">Priority</label>
        <select id="f-priority" value={filters.priority} onChange={(e) => onChange({ priority: e.target.value })}>
          <option value="">Any</option>
          <PriorityOptions />
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-sort">Sort by</label>
        <div className="sort-group">
          <select id="f-sort" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })}>
            {SORT_FIELDS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            className="btn--icon"
            onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
            aria-label={`Sort order: ${filters.order === 'asc' ? 'ascending' : 'descending'}. Click to toggle.`}
            title="Toggle sort order"
          >
            {filters.order === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </div>
      <Button variant="ghost" onClick={onClear} disabled={!active} className="filters__clear">
        Clear filters
      </Button>
    </div>
  );
}
