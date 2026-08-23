import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Object storage behind a narrow interface.
 *
 * The local driver keeps files outside `public/` on purpose: memory photos are
 * couple-private, so they are served through an authorised route rather than a
 * guessable public URL. Swapping in S3/R2 later means implementing this same
 * interface, not touching any caller.
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

export const storage: StorageDriver = localDriver;

export function assertUploadAllowed(file: { type: string; size: number }) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, WebP, GIF or AVIF image.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That image is larger than 8 MB.');
  }
}
