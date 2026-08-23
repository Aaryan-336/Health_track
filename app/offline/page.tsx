import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Offline' };

/**
 * Served by the service worker when a navigation fails. It has to be entirely
 * static — no session, no database — because it renders with no network.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <span aria-hidden className="grid h-28 w-28 place-items-center rounded-blob bg-blush-soft text-5xl shadow-soft">
        🌙
      </span>

      <h1 className="mt-8 font-display text-[2rem] leading-tight tracking-[-0.03em]">
        You&rsquo;re offline
      </h1>
      <p className="mt-2.5 max-w-[20rem] text-[0.95rem] leading-relaxed text-muted">
        Bloom needs a connection to load your day. Everything you logged is safe — it will be here
        when you&rsquo;re back.
      </p>

      <Link
        href="/home"
        className="mt-7 inline-flex h-13 items-center rounded-pill bg-accent px-7 font-bold text-accent-ink shadow-lift"
      >
        Try again
      </Link>
    </main>
  );
}
