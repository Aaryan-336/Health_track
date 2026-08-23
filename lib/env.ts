import { z } from 'zod';

/**
 * Server-only environment. Importing this from a client component is a build
 * error by design — secrets must never reach the browser bundle.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  VAPID_SUBJECT: z.string().min(1).default('mailto:hello@healthtrack.app'),
  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  CRON_SECRET: z.string().min(1).default('dev-cron-secret'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_BUCKET: z.string().default('health-track-media'),
  AI_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('llama-3.3-70b-versatile'),
});

let cached: z.infer<typeof serverSchema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Public values that are safe to expose to the browser. */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
};

export const pushConfigured = () =>
  Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export const aiConfigured = () => Boolean(process.env.AI_API_KEY);
