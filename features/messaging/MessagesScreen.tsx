'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { Empty, Pill } from '@/components/ui/Empty';
import { PageHeader } from '@/components/layout/PageHeader';
import { resolveBackground } from '@/lib/backgrounds';

type Message = {
  id: string;
  body: string;
  messageType: string;
  background: string;
  createdAt: string;
  scheduledFor: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  senderId: string;
  senderName: string;
  reactions: { id: string; reaction: string; userId: string }[];
};

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export function MessagesScreen({
  messages,
  viewerId,
  partnerName,
}: {
  messages: Message[];
  viewerId: string;
  partnerName: string;
}) {
  const scheduled = messages.filter((m) => m.scheduledFor && !m.deliveredAt);
  const delivered = messages.filter((m) => !m.scheduledFor || m.deliveredAt);

  return (
    <div>
      <PageHeader
        title="Little notes"
        subtitle={`Between you and ${partnerName.split(' ')[0]}.`}
        action={
          <Link
            href="/us/messages/new"
            aria-label="Write a note"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </Link>
        }
      />

      {scheduled.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2.5 px-1 font-display text-[1.25rem]">Waiting to send</h2>
          <div className="space-y-2.5">
            {scheduled.map((m) => (
              <NoteCard key={m.id} message={m} viewerId={viewerId} pending />
            ))}
          </div>
        </section>
      )}

      {delivered.length === 0 ? (
        <Empty
          emoji="💌"
          title="No notes yet"
          body={`Write something small for ${partnerName.split(' ')[0]} — it doesn't have to be profound.`}
          action={
            <Link
              href="/us/messages/new"
              className="inline-flex h-11 items-center rounded-pill bg-accent px-5 font-bold text-accent-ink"
            >
              Write the first one
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {delivered.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.4 }}
            >
              <NoteCard message={m} viewerId={viewerId} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({
  message,
  viewerId,
  pending,
}: {
  message: Message;
  viewerId: string;
  pending?: boolean;
}) {
  const bg = resolveBackground(message.background);
  const fromMe = message.senderId === viewerId;
  const unread = !fromMe && !message.openedAt;

  const card = (
    <div
      className="relative overflow-hidden rounded-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift"
      style={{ background: bg.gradient, color: bg.ink }}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-[0.72rem] font-bold uppercase tracking-[0.13em] opacity-65">
          {fromMe ? 'You wrote' : `${message.senderName.split(' ')[0]} wrote`}
        </span>
        <span className="text-[0.72rem] font-bold opacity-55">
          {pending && message.scheduledFor
            ? `sends ${new Date(message.scheduledFor).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}`
            : when(message.createdAt)}
        </span>
      </div>

      <p className="font-display text-[1.2rem] leading-snug">
        {message.body.length > 130 ? `${message.body.slice(0, 127)}…` : message.body}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {unread && (
          <span className="rounded-pill bg-white/60 px-2.5 py-1 text-[0.7rem] font-bold">
            ● new
          </span>
        )}
        {pending && (
          <span className="rounded-pill bg-white/60 px-2.5 py-1 text-[0.7rem] font-bold">
            ⏳ scheduled
          </span>
        )}
        {message.reactions.map((r) => (
          <span key={r.id} className="rounded-pill bg-white/55 px-2.5 py-1 text-[0.8rem]">
            {r.reaction}
          </span>
        ))}
        <span aria-hidden className="ml-auto text-base opacity-60">
          {bg.emoji}
        </span>
      </div>
    </div>
  );

  // A scheduled note has no experience to open yet.
  return pending ? card : <Link href={`/message/${message.id}`} className="block">{card}</Link>;
}
