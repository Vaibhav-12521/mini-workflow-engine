import { Router } from 'express';
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from '@mwe/shared';
import { assertTaskId, parseOrThrow } from '../http/validate';
import type { TaskService } from '../services/taskService';

export function tasksRouter(service: TaskService): Router {
  const r = Router();

  r.post('/', async (req, res) => {
    const input = parseOrThrow(createTaskSchema, req.body);
    res.status(201).json(await service.create(input));
  });

  r.get('/', async (req, res) => {
    const query = parseOrThrow(listTasksQuerySchema, req.query);
    res.json(await service.list(query));
  });

  r.get('/:id', async (req, res) => {
    res.json(await service.get(assertTaskId(req.params.id)));
  });

  r.patch('/:id', async (req, res) => {
    const id = assertTaskId(req.params.id);
    const input = parseOrThrow(updateTaskSchema, req.body);
    res.json(await service.update(id, input));
  });

  r.delete('/:id', async (req, res) => {
    await service.remove(assertTaskId(req.params.id));
    res.status(204).end();
  });

  r.get('/:id/activities', async (req, res) => {
    res.json({ data: await service.activities(assertTaskId(req.params.id)) });
  });

  return r;
}
