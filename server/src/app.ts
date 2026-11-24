import express, { type ErrorRequestHandler } from 'express';
import type { Database } from './db/client';
import { AppError } from './http/errors';
import { tasksRouter } from './routes/tasks';
import { createTaskService } from './services/taskService';

/** Builds the Express app around a database. Tests pass an in-memory database. */
export function createApp(db: Database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/tasks', tasksRouter(createTaskService(db)));

  app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Route not found')));

  // One place turns every error into the standard error body. Raw DB errors never reach the client.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json(err.toBody());
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json(new AppError(400, 'BAD_REQUEST', 'Request body is not valid JSON').toBody());
      return;
    }
    if (process.env.NODE_ENV !== 'test') console.error('[unhandled]', err);
    res.status(500).json(new AppError(500, 'INTERNAL', 'Something went wrong. Please try again.').toBody());
  };
  app.use(errorHandler);

  return app;
}
