import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { statusMeta, type Task, type TaskStatus } from '@mwe/shared';
import { ApiError, tasksApi } from '../api/client';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { PriorityChip, StatusChip } from '../components/Chip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Banner, Button, ErrorState, Loading, StatusOptions } from '../components/ui';
import { fullDate } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import { useFlash } from '../lib/useFlash';
import { NotFoundPage } from './NotFoundPage';

/** S-03 Task detail: fields on top, status control, Edit / Delete, activity timeline below. */
export function TaskDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [flash, clearFlash] = useFlash(location);

  const task = useAsync(() => tasksApi.get(id), [id]);
  const history = useAsync(() => tasksApi.activities(id), [id]);

  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ tone: 'success' | 'error'; text: string; conflict?: boolean } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (task.state.status === 'error') {
    return task.state.error.status === 404 ? <NotFoundPage /> : <ErrorState error={task.state.error} onRetry={task.reload} />;
  }
  if (!task.state.data) return <Loading label="Loading task…" />;
  const t: Task = task.state.data;

  const changeStatus = async (next: TaskStatus) => {
    setStatusSaving(true);
    setStatusMsg(null);
    clearFlash();
    try {
      const updated = await tasksApi.update(t.id, { status: next, version: t.version });
      task.setData(updated); // show the new status right after success
      history.reload();
      setStatusMsg({ tone: 'success', text: `Status updated to ${statusMeta(next)?.label ?? next}` });
    } catch (err) {
      const e = err instanceof ApiError ? err : null;
      setStatusMsg({
        tone: 'error',
        conflict: e?.code === 'CONFLICT',
        text:
          e?.code === 'CONFLICT'
            ? 'Someone else changed this task. Reload to see the latest version, then try again.'
            : e?.message ?? 'Could not update the status',
      });
    } finally {
      setStatusSaving(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await tasksApi.remove(t.id);
      navigate('/', { state: { flash: `Task “${t.title}” deleted` } });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete the task');
      setDeleting(false);
    }
  };

  return (
    <>
      <Link to="/" className="back-link">
        ‹ Back to list
      </Link>

      {flash && (
        <Banner tone="success" onDismiss={clearFlash}>
          {flash}
        </Banner>
      )}

      <article className="card detail">
        <header className="detail__header">
          <h1 className="detail__title">{t.title}</h1>
          <div className="detail__actions">
            <Link className="btn btn--secondary" to={`/tasks/${t.id}/edit`}>
              Edit
            </Link>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Delete
            </Button>
          </div>
        </header>

        <div className="detail__chips">
          <StatusChip value={t.status} />
          <PriorityChip value={t.priority} />
        </div>

        <p className={`detail__desc ${t.description ? '' : 'muted'}`}>{t.description || 'No description.'}</p>

        <dl className="detail__meta">
          <div>
            <dt>Created</dt>
            <dd>{fullDate(t.createdAt)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{fullDate(t.updatedAt)}</dd>
          </div>
        </dl>

        <div className="status-control">
          <label htmlFor="status-select">Change status</label>
          <select
            id="status-select"
            value={t.status}
            disabled={statusSaving}
            onChange={(e) => changeStatus(e.target.value as TaskStatus)}
          >
            <StatusOptions />
          </select>
          {statusSaving && <span className="spinner" role="status" aria-label="Saving status" />}
        </div>
        {statusMsg && (
          <Banner tone={statusMsg.tone} onDismiss={() => setStatusMsg(null)}>
            {statusMsg.text}{' '}
            {statusMsg.conflict && (
              <Button variant="ghost" onClick={() => { task.reload(); history.reload(); setStatusMsg(null); }}>
                Reload
              </Button>
            )}
          </Banner>
        )}
      </article>

      <section className="card" aria-labelledby="activity-heading">
        <h2 id="activity-heading">Activity</h2>
        {history.state.status === 'error' ? (
          <ErrorState error={history.state.error} onRetry={history.reload} />
        ) : !history.state.data ? (
          <Loading label="Loading history…" />
        ) : (
          <ActivityTimeline items={history.state.data} />
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this task?"
        confirmLabel="Delete task"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteError(null);
        }}
      >
        <p>
          <strong>“{t.title}”</strong> will be removed from the list. Its history is kept for audit.
        </p>
      </ConfirmDialog>
    </>
  );
}
