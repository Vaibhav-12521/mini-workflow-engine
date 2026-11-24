import type { ApiErrorBody, ErrorCode } from '@mwe/shared';

/**
 * Every error the API returns goes through this class, so all responses share one shape:
 *   { "error": { "code": "...", "message": "...", "details": ... } }
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details: ApiErrorBody['error']['details'] = [],
  ) {
    super(message);
    this.name = 'AppError';
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}

export const notFound = (what = 'Task') => new AppError(404, 'NOT_FOUND', `${what} not found`);

export const validationFailed = (details: Array<{ path: string; message: string }>) =>
  new AppError(422, 'VALIDATION_FAILED', 'Some fields are invalid', details);

export const conflict = (message: string, details: Record<string, unknown>) =>
  new AppError(409, 'CONFLICT', message, details);
