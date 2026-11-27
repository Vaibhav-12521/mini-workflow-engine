import { useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { DEFAULT_ORDER, DEFAULT_SORT, PAGE_SIZE_DEFAULT, STATUSES, priorityMeta, statusMeta } from '@mwe/shared';
import { tasksApi } from '../api/client';
import { PriorityChip, StatusChip } from '../components/Chip';
import { FilterBar, type Filters } from '../components/FilterBar';
import { Pagination } from '../components/Pagination';
import { MiniTrack } from '../components/StatusTrack';
import { Banner, Button, EmptyState, ErrorState, SkeletonRows } from '../components/ui';
import { fullDate, timeAgo } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useFlash } from '../lib/useFlash';
import { usePipeline } from '../lib/pipeline';

export function TaskListPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [flash, clearFlash] = useFlash(location);
  const { counts } = usePipeline();

  const filters: Filters = {
    status: params.get('status') ?? '',
    priority: params.get('priority') ?? '',
    q: params.get('q') ?? '',
    sort: params.get('sort') ?? DEFAULT_SORT,
    order: params.get('order') ?? DEFAULT_ORDER,
  };
  const page = Math.max(1, Number(params.get('page')) || 1);

  const { state, reload } = useAsync(
    () => tasksApi.list({ ...filters, page, pageSize: PAGE_SIZE_DEFAULT }),
    [params.toString()],
  );

  const update = useCallback(
    (patch: Partial<Filters> & { page?: number }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === '' || v === undefined) next.delete(k);
            else next.set(k, String(v));
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const filtered = Boolean(filters.status || filters.priority || filters.q);
  const summary = [
    filters.status && `status = ${statusMeta(filters.status)?.label ?? filters.status}`,
    filters.priority && `priority = ${priorityMeta(filters.priority)?.label ?? filters.priority}`,
    filters.q && `text contains “${filters.q}”`,
  ].filter(Boolean);

  const result = state.data;

  return (
    <>
      <header className="page-header">
        <h1>Tasks</h1>
        <Link className="btn btn--primary page-header__cta" to="/tasks/new">
          New task
        </Link>
      </header>

      {}
      <div className="tabs" role="group" aria-label="Filter by status">
        <button type="button" className="tabs__item" aria-pressed={!filters.status} onClick={() => update({ status: '' })}>
          All <span className="tabs__count">{counts?.total ?? ''}</span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            className="tabs__item"
            aria-pressed={filters.status === s.value}
            onClick={() => update({ status: filters.status === s.value ? '' : s.value })}
          >
            {s.label} <span className="tabs__count">{counts?.byStatus[s.value] ?? ''}</span>
          </button>
        ))}
      </div>

      {flash && (
        <Banner tone="success" onDismiss={clearFlash}>
          {flash}
        </Banner>
      )}

      <FilterBar filters={filters} onChange={update} onClear={() => setParams({}, { replace: true })} />

      {filtered && result && (
        <p className="filter-summary" aria-live="polite">
          Filtered: {summary.join(' · ')} · {result.pagination.total} {result.pagination.total === 1 ? 'result' : 'results'}
        </p>
      )}

      {state.status === 'error' ? (
        <ErrorState error={state.error} onRetry={reload} />
      ) : !result ? (
        <SkeletonRows />
      ) : result.data.length === 0 ? (
        filtered ? (
          <EmptyState title="No tasks match these filters">
            <Button onClick={() => setParams({}, { replace: true })}>Clear filters</Button>
          </EmptyState>
        ) : (
          <EmptyState title="No tasks yet">
            <p>Create your first task to start tracking work.</p>
            <Link className="btn btn--primary" to="/tasks/new">
              + New task
            </Link>
          </EmptyState>
        )
      ) : (
        <div className={`card table-wrap ${state.status === 'loading' ? 'is-refreshing' : ''}`} aria-busy={state.status === 'loading'}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className="table__row"
                >
                  <td>
                    <Link to={`/tasks/${t.id}`} onClick={(e) => e.stopPropagation()} className="table__title">
                      {t.title}
                    </Link>
                    {t.description && <span className="table__desc">{t.description}</span>}
                  </td>
                  <td data-label="Status">
                    <span className="status-cell">
                      <StatusChip value={t.status} />
                      <MiniTrack value={t.status} />
                    </span>
                  </td>
                  <td data-label="Priority">
                    <PriorityChip value={t.priority} />
                  </td>
                  <td data-label="Updated">
                    <time dateTime={t.updatedAt} title={fullDate(t.updatedAt)}>
                      {timeAgo(t.updatedAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            total={result.pagination.total}
            onPage={(p) => update({ page: p })}
          />
        </div>
      )}
    </>
  );
}
