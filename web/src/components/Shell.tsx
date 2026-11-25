import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { STATUSES } from '@mwe/shared';
import { usePipeline } from '../lib/pipeline';
import { useTheme, type ThemeChoice } from '../lib/theme';

const THEME_LABEL: Record<ThemeChoice, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };
const THEME_ICON: Record<ThemeChoice, string> = { system: '◑', light: '☀', dark: '☾' };

function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="8" className="brand__mark-bg" />
      <path d="M9 21.5 14 11l4 7 2.5-4L24 21.5" className="brand__mark-line" />
      <circle cx="9" cy="21.5" r="2" className="brand__mark-dot" />
      <circle cx="24" cy="21.5" r="2" className="brand__mark-dot" />
    </svg>
  );
}

function Brand() {
  return (
    <Link to="/" className="brand">
      <BrandMark />
      <span className="brand__text">
        <span className="brand__name">Mini Workflow</span>
        <span className="brand__tag">tasks · status · history</span>
      </span>
    </Link>
  );
}

function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { theme, cycle } = useTheme();
  return (
    <button
      type="button"
      className={`theme-switch ${compact ? 'theme-switch--compact' : ''}`}
      onClick={cycle}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to change.`}
      title="Change theme"
    >
      <span aria-hidden="true">{THEME_ICON[theme]}</span>
      {!compact && <span>Theme · {THEME_LABEL[theme]}</span>}
    </button>
  );
}

/** Desktop side rail: navigation, the live workflow pipeline (counts per status) and the theme switch. */
export function Sidebar() {
  const { counts } = usePipeline();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const onList = pathname === '/';
  const activeStatus = onList ? params.get('status') ?? '' : null;
  const total = counts?.total ?? 0;

  return (
    <aside className="rail" aria-label="Workspace">
      <Brand />

      <Link to="/tasks/new" className="rail__new">
        <span aria-hidden="true">＋</span> New task <kbd>N</kbd>
      </Link>

      <nav className="rail__nav" aria-label="Main">
        <NavLink to="/" end className={() => `rail__link ${onList && !activeStatus ? 'is-active' : ''}`}>
          <span aria-hidden="true">▤</span> All tasks
          <span className="rail__count">{counts ? counts.total : '·'}</span>
        </NavLink>
      </nav>

      <section className="pipeline" aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" className="rail__heading">
          Workflow
        </h2>
        <ol className="pipeline__list">
          {STATUSES.map((s, i) => {
            const n = counts?.byStatus[s.value] ?? 0;
            const pct = total ? Math.round((n / total) * 100) : 0;
            return (
              <li key={s.value}>
                <Link
                  to={`/?status=${s.value}`}
                  className={`pipeline__item tone-${s.tone} ${activeStatus === s.value ? 'is-active' : ''}`}
                  aria-current={activeStatus === s.value ? 'page' : undefined}
                >
                  <span className="pipeline__step" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="pipeline__label">
                    <span aria-hidden="true">{s.icon}</span> {s.label}
                  </span>
                  <span className="pipeline__count">{counts ? n : '·'}</span>
                  <span className="pipeline__bar" aria-hidden="true">
                    <span style={{ inlineSize: `${pct}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="rail__foot">
        <p className="rail__hint">
          <kbd>/</kbd> search · <kbd>N</kbd> new task
        </p>
        <ThemeSwitch />
      </div>
    </aside>
  );
}

/** Compact header for tablet and phone widths, where the side rail is hidden. */
export function TopBar() {
  return (
    <header className="topbar">
      <Brand />
      <div className="topbar__actions">
        <ThemeSwitch compact />
        <Link to="/tasks/new" className="btn btn--primary btn--sm">
          ＋ New
        </Link>
      </div>
    </header>
  );
}
