import { Link } from 'react-router-dom';

/** S-05 Not found: unknown task id or unknown route. */
export function NotFoundPage({ what = 'task' }: { what?: string }) {
  return (
    <div className="not-found">
      <p className="not-found__code" aria-hidden="true">
        404
      </p>
      <h1>We couldn’t find that {what}</h1>
      <p className="muted">It may have been deleted, or the link is wrong. Its history is kept, but it no longer appears in the workflow.</p>
      <Link to="/" className="btn btn--primary">
        ‹ Back to task list
      </Link>
    </div>
  );
}
