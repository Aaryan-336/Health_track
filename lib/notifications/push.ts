import webpush from 'web-push';

import { env, pushConfigured } from '@/lib/env';

/** Payload the service worker receives and renders. */
export type PushPayload = {
  title: string;
  body: string;
  /** Deep link opened when the notification is tapped. */
  url: string;
  tag?: string;
  icon?: string;
  badge?: string;
  emoji?: string;
  /** Drives the cute full-screen experience the deep link lands on. */
  background?: string;
};

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  if (!pushConfigured()) return false;
  const e = env();
  webpush.setVapidDetails(e.VAPID_SUBJECT, e.VAPID_PUBLIC_KEY, e.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export type SendOutcome =
  | { ok: true }
  | { ok: false; gone: boolean; error: string };

export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<SendOutcome> {
  if (!ensureConfigured()) {
    return { ok: false, gone: false, error: 'Push is not configured on this server.' };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return { ok: true };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    // 404/410 mean the browser dropped this subscription — retire it.
    const gone = status === 404 || status === 410;
    return { ok: false, gone, error: (error as Error).message ?? 'Push failed' };
  }
}
