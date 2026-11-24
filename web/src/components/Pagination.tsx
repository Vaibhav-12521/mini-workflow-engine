import { Button } from './ui';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPage }: PaginationProps) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        Page {page} of {totalPages} · {total} {total === 1 ? 'task' : 'tasks'}
      </span>
      <div className="pagination__buttons">
        <Button onClick={() => onPage(page - 1)} disabled={page <= 1}>
          ‹ Prev
        </Button>
        <Button onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
          Next ›
        </Button>
      </div>
    </nav>
  );
}
