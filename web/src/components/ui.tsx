import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { PRIORITIES, STATUSES } from '@mwe/shared';
import type { ApiError } from '../api/client';

/* ---------- Button ---------- */

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  variant = 'secondary',
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...rest}
      className={`btn btn--${variant} ${rest.className ?? ''}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ---------- Select options from the shared definition (no hard-coded values in the UI) ---------- */

export const StatusOptions = () => (
  <>
    {STATUSES.map((s) => (
      <option key={s.value} value={s.value}>
        {s.label}
      </option>
    ))}
  </>
);

export const PriorityOptions = () => (
  <>
    {PRIORITIES.map((p) => (
      <option key={p.value} value={p.value}>
        {p.label}
      </option>
    ))}
  </>
);

/* ---------- Page states: loading, empty, error, banner ---------- */

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner spinner--lg" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading tasks">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state">
      <svg className="state__art" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="10" y="14" width="44" height="38" rx="8" />
        <path d="M20 28h24M20 36h16M20 44h10" />
        <circle cx="48" cy="16" r="8" />
      </svg>
      <p className="state__title">{title}</p>
      {children}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden="true">!</span>
      <p className="state__title">Something went wrong</p>
      <p>{error.message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Banner({
  tone,
  children,
  onDismiss,
}: {
  tone: 'success' | 'error' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className={`banner banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{tone === 'success' ? '✓' : tone === 'error' ? '!' : 'i'}</span>
      <div className="banner__body">{children}</div>
      {onDismiss && (
        <button className="banner__close" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}
