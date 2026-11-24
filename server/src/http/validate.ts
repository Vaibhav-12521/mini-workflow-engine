import type { z } from 'zod';
import { notFound, validationFailed } from './errors';

/** Parse with a zod schema or throw a 422 listing every invalid field. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw validationFailed(
      result.error.issues.map((i) => ({ path: i.path.join('.') || '(body)', message: i.message })),
    );
  }
  return result.data;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id can never match a task, so it is reported as 404 (not a raw DB cast error). */
export function assertTaskId(id: string): string {
  if (!UUID_RE.test(id)) throw notFound();
  return id;
}
