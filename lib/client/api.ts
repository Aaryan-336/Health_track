'use client';

/** Thin fetch wrapper that surfaces the server's friendly error message. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = Omit<RequestInit, 'body'> & { body?: unknown };

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const isFormData = body instanceof FormData;

  const res = await fetch(path.startsWith('/api') ? path : `/api/v1${path}`, {
    ...rest,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as { data?: T; error?: { code: string; message: string; details?: unknown } }) : {};

  if (!res.ok) {
    const err = json.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Something went wrong.',
      err?.details,
    );
  }

  return json.data as T;
}

export const get = <T>(p: string) => api<T>(p);
export const post = <T>(p: string, body?: unknown) => api<T>(p, { method: 'POST', body });
export const patch = <T>(p: string, body?: unknown) => api<T>(p, { method: 'PATCH', body });
export const del = <T>(p: string, body?: unknown) => api<T>(p, { method: 'DELETE', body });
