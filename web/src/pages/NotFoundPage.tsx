import { Link } from 'react-router-dom';

export function NotFoundPage({ what = 'task' }: { what?: string }) {
  return (
    <div className="not-found">
      <p className="not-found__code" aria-hidden="true">
        404
      </p>
      <h1>We couldn’t find that {what}</h1>
      <p className="muted">It may have been deleted, or the link is wrong.</p>
      <Link to="/" className="btn btn--primary">
        Back to tasks
      </Link>
    </div>
  );
}
