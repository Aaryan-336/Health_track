'use client';

import { post, del } from './api';

/**
 * Browser-side push subscription.
 *
 * Permission is always requested explicitly by a user gesture — the app never
 * asks on load, and never sends anything without a granted subscription.
 */

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalised);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function currentPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'default') return 'default';

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'subscribed' : 'granted';
}

export async function enablePush(vapidPublicKey: string): Promise<PushState> {
  if (!pushSupported()) throw new Error('This browser cannot receive push notifications.');
  if (!vapidPublicKey) throw new Error('Push is not configured on this server yet.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    }));

  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  await post('/notifications/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    deviceMetadata: { userAgent: navigator.userAgent.slice(0, 200), language: navigator.language },
  });

  return 'subscribed';
}

export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await del('/notifications/subscribe', { endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return Notification.permission === 'granted' ? 'granted' : 'default';
}
