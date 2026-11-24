import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { TaskCreatePage, TaskEditPage } from './pages/TaskFormPages';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { TaskListPage } from './pages/TaskListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './styles/tokens.css';
import './styles/app.css';

function App() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="topbar__brand">
          <span aria-hidden="true">◆</span> Mini Workflow
        </Link>
      </header>
      <main id="main" className="container">
        <Routes>
          <Route path="/" element={<TaskListPage />} />
          <Route path="/tasks/new" element={<TaskCreatePage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
          <Route path="/tasks/:id/edit" element={<TaskEditPage />} />
          <Route path="*" element={<NotFoundPage what="page" />} />
        </Routes>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
