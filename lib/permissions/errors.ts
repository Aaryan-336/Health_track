export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Unauthorized = (m = 'You need to sign in.') => new AppError(401, 'UNAUTHORIZED', m);
export const Forbidden = (m = 'You do not have access to this.') => new AppError(403, 'FORBIDDEN', m);
export const NotFound = (m = 'Not found.') => new AppError(404, 'NOT_FOUND', m);
export const BadRequest = (m = 'That request was not valid.', d?: unknown) =>
  new AppError(400, 'BAD_REQUEST', m, d);
export const Conflict = (m = 'That conflicts with something that already exists.') =>
  new AppError(409, 'CONFLICT', m);
