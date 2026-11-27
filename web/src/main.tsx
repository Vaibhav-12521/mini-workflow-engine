import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, TopBar } from './components/Shell';
import { PipelineProvider } from './lib/pipeline';
import { TaskCreatePage, TaskEditPage } from './pages/TaskFormPages';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { TaskListPage } from './pages/TaskListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './styles/tokens.css';
import './styles/app.css';

function useShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return;
      if (e.key === '/') {
        const search = document.getElementById('f-q');
        if (search) {
          e.preventDefault();
          search.focus();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/tasks/new');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);
}

function App() {
  const { pathname } = useLocation();
  useShortcuts();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <PipelineProvider refreshKey={pathname}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="shell">
        <Sidebar />
        <div className="shell__main">
          <TopBar />
          <main id="main" className="container" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<TaskListPage />} />
              <Route path="/tasks/new" element={<TaskCreatePage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />
              <Route path="/tasks/:id/edit" element={<TaskEditPage />} />
              <Route path="*" element={<NotFoundPage what="page" />} />
            </Routes>
          </main>
        </div>
      </div>
    </PipelineProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
