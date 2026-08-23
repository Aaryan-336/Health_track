import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '@/lib/db/client';

/**
 * Object storage behind a narrow interface.
 *
 * Both drivers keep files out of `public/` on purpose: memory photos are
 * couple-private, so they are served through an authorised route rather than a
 * guessable public URL.
 *
 *  • `local`    — the filesystem, used in development.
 *  • `postgres` — rows in the database, for a host with no persistent disk.
 *  • `supabase` — a private Supabase Storage bucket, reached over its REST API
 *                 with the service-role key. Nothing is ever public: reads
 *                 still go through the app's authorised media route.
 *
 * Swapping in S3/R2 later means implementing this same interface, not touching
 * any caller.
 */

export type StoredObject = { key: string; contentType: string; size: number };

export interface StorageDriver {
  put(body: Buffer, contentType: string, prefix: string): Promise<StoredObject>;
  get(key: string): Promise<{ body: Buffer; contentType: string } | null>;
  remove(key: string): Promise<void>;
}

const ROOT = path.join(process.cwd(), 'storage');

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Rejects traversal and any key we did not mint ourselves. */
function safeKeyPath(key: string): string {
  if (!/^[a-z0-9/_-]+\.[a-z0-9]+$/i.test(key) || key.includes('..')) {
    throw new Error('Invalid storage key');
  }
  const full = path.join(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error('Invalid storage key');
  return full;
}

const localDriver: StorageDriver = {
  async put(body, contentType, prefix) {
    const ext = EXTENSIONS[contentType] ?? 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;
    const full = safeKeyPath(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    await writeFile(`${full}.type`, contentType, 'utf8');
    return { key, contentType, size: body.byteLength };
  },

  async get(key) {
    try {
      const full = safeKeyPath(key);
      const [body, contentType] = await Promise.all([
        readFile(full),
        readFile(`${full}.type`, 'utf8').catch(() => 'application/octet-stream'),
      ]);
      return { body, contentType: contentType.trim() };
    } catch {
      return null;
    }
  },

  async remove(key) {
    try {
      const full = safeKeyPath(key);
      await unlink(full);
      await unlink(`${full}.type`).catch(() => {});
    } catch {
      /* already gone */
    }
  },
};

/**
 * Photos live in Postgres alongside everything else. At two-people scale the
 * volume is tiny, and it means one durable store to back up rather than two.
 */
const postgresDriver: StorageDriver = {
  async put(body, contentType, prefix) {
    const ext = EXTENSIONS[contentType] ?? 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;
    await prisma.storageObject.create({
      data: { key, contentType, size: body.byteLength, bytes: new Uint8Array(body) },
    });
    return { key, contentType, size: body.byteLength };
  },

  async get(key) {
    const row = await prisma.storageObject.findUnique({ where: { key } });
    return row ? { body: Buffer.from(row.bytes), contentType: row.contentType } : null;
  },

  async remove(key) {
    await prisma.storageObject.deleteMany({ where: { key } });
  },
};

/**
 * Supabase Storage over its REST API — no SDK, so no extra dependency. The
 * bucket must be private; the service-role key never leaves the server.
 */
const supabaseDriver: StorageDriver = {
  async put(body, contentType, prefix) {
    const ext = EXTENSIONS[contentType] ?? 'bin';
    const key = `${prefix}/${randomUUID()}.${ext}`;

    const res = await fetch(objectUrl(key), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey()}`,
        'Content-Type': contentType,
        'Cache-Control': 'max-age=3600',
      },
      body: new Uint8Array(body),
    });
    if (!res.ok) {
      throw new Error(`Storage upload failed (${res.status}): ${await res.text()}`);
    }

    return { key, contentType, size: body.byteLength };
  },

  async get(key) {
    const res = await fetch(objectUrl(key), {
      headers: { Authorization: `Bearer ${serviceKey()}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    return {
      body: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get('content-type') ?? 'application/octet-stream',
    };
  },

  async remove(key) {
    await fetch(objectUrl(key), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceKey()}` },
    }).catch(() => undefined);
  },
};

function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  return key;
}

function objectUrl(key: string): string {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base) throw new Error('SUPABASE_URL is not set.');
  const bucket = process.env.STORAGE_BUCKET || 'memories';
  return `${base}/storage/v1/object/${bucket}/${key}`;
}

/** Resolved per call so the driver is never read at build time. */
function driver(): StorageDriver {
  switch (process.env.STORAGE_DRIVER) {
    case 'supabase':
      return supabaseDriver;
    case 'postgres':
      return postgresDriver;
    default:
      return localDriver;
  }
}

export const storage: StorageDriver = {
  put: (body, contentType, prefix) => driver().put(body, contentType, prefix),
  get: (key) => driver().get(key),
  remove: (key) => driver().remove(key),
};

export function assertUploadAllowed(file: { type: string; size: number }) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, WebP, GIF or AVIF image.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That image is larger than 8 MB.');
  }
}
