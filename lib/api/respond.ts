import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AppError } from '@/lib/permissions/errors';

export const ok = <T>(data: T, status = 200) => NextResponse.json({ data }, { status });

export function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some of those details need another look.',
          details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      { status: 400 },
    );
  }
  console.error('[api] unhandled error', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' } },
    { status: 500 },
  );
}

/** Wraps a route handler so every thrown AppError/ZodError becomes a clean response. */
export function route<Args extends unknown[]>(
  handler: (req: Request, ...args: Args) => Promise<Response>,
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      return fail(error);
    }
  };
}

export async function jsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
