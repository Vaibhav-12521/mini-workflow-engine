import { Link, useNavigate, useParams } from 'react-router-dom';
import { tasksApi } from '../api/client';
import { TaskForm } from '../components/TaskForm';
import { ErrorState, Loading } from '../components/ui';
import { useAsync } from '../lib/useAsync';
import { NotFoundPage } from './NotFoundPage';

/** S-02 (create). Uses the shared TaskForm. */
export function TaskCreatePage() {
  const navigate = useNavigate();
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Tasks</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="crumbs__current">New task</span>
      </nav>
      <h1>New task</h1>
      <TaskForm
        mode="create"
        onCancel={() => navigate('/')}
        onSubmit={async ({ title, description, priority }) => {
          const task = await tasksApi.create({ title, description, priority });
          navigate(`/tasks/${task.id}`, { state: { flash: 'Task created' } });
        }}
      />
    </>
  );
}

/** S-02 (edit). Same TaskForm; sends the version it loaded so concurrent edits are detected. */
export function TaskEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state, reload } = useAsync(() => tasksApi.get(id), [id]);

  if (state.status === 'error') {
    return state.error.status === 404 ? <NotFoundPage /> : <ErrorState error={state.error} onRetry={reload} />;
  }
  if (state.status === 'loading') return <Loading label="Loading task…" />;

  const task = state.data;
  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Tasks</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/tasks/${task.id}`} className="crumbs__mid">{task.title}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="crumbs__current">Edit</span>
      </nav>
      <h1>Edit task</h1>
      <TaskForm
        key={task.version}
        mode="edit"
        initial={task}
        onCancel={() => navigate(`/tasks/${task.id}`)}
        onSubmit={async (values) => {
          await tasksApi.update(task.id, { ...values, version: task.version });
          navigate(`/tasks/${task.id}`, { state: { flash: 'Changes saved' } });
        }}
      />
    </>
  );
}
