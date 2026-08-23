'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MessageCanvas } from '@/components/messages/MessageCanvas';
import { PigAndPenguin } from '@/components/messages/PigAndPenguin';
import { ApiError, post } from '@/lib/client/api';
import { resolveBackground } from '@/lib/backgrounds';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type Person = { id: string; displayName: string; avatarUrl: string | null };
type Message = {
  id: string;
  body: string;
  messageType: string;
  background: string;
  createdAt: string;
  openedAt: string | null;
  sender: Person;
  recipient: Person;
  reactions: { id: string; reaction: string; userId: string; userName: string }[];
};

const REACTIONS = ['🥰', '🥹', '😂', '🤍', '🐷', '🐧'];

const TYPE_LABEL: Record<string, string> = {
  NOTE: 'a note',
  ENCOURAGEMENT: 'some encouragement',
  THINKING_OF_YOU: 'thinking of you',
  CELEBRATION: 'something to celebrate',
  REMINDER: 'a reminder',
};

/**
 * The full-screen note. An unopened note stays sealed until the recipient
 * chooses to open it, so arriving on this screen always feels like a moment
 * rather than a notification that already spent itself.
 */
export function MessageExperience({
  message,
  viewerId,
  isRecipient,
}: {
  message: Message;
  viewerId: string;
  isRecipient: boolean;
}) {
  const sealed = isRecipient && !message.openedAt;
  const [opened, setOpened] = useState(!sealed);
  const [reactions, setReactions] = useState(message.reactions);
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const reduce = useReducedMotion();
  const bg = resolveBackground(message.background);

  const mine = reactions.find((r) => r.userId === viewerId);
  const theirs = reactions.filter((r) => r.userId !== viewerId);

  // Record the open exactly once, and only for the recipient.
  useEffect(() => {
    if (!opened || !isRecipient || message.openedAt) return;
    void post(`/messages/${message.id}/read`)
      .then(() => router.refresh())
      .catch(() => {});
  }, [opened, isRecipient, message.id, message.openedAt, router]);

  const react = async (emoji: string) => {
    if (busy) return;
    setBusy(true);
    const previous = reactions;
    const optimistic = [
      ...reactions.filter((r) => r.userId !== viewerId),
      { id: 'pending', reaction: emoji, userId: viewerId, userName: 'You' },
    ];
    setReactions(optimistic);

    try {
      await post(`/messages/${message.id}/react`, { reaction: emoji });
      router.refresh();
    } catch (error) {
      setReactions(previous); // rollback
      toast(error instanceof ApiError ? error.message : 'Could not react.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MessageCanvas background={message.background}>
      <div className="flex min-h-dvh flex-col px-6 pb-safe pt-safe">
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/us/messages')}
            aria-label="Close"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/45 backdrop-blur-sm transition-transform active:scale-95"
            style={{ color: bg.ink }}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>

          <span
            className="rounded-pill bg-white/45 px-3.5 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] backdrop-blur-sm"
            style={{ color: bg.ink }}
          >
            {TYPE_LABEL[message.messageType] ?? 'a note'}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {!opened ? (
            /* ── Sealed ───────────────────────────────────────────────── */
            <motion.div
              key="sealed"
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.4 }}
              className="flex flex-1 flex-col items-center justify-center text-center"
            >
              <motion.button
                type="button"
                onClick={() => setOpened(true)}
                whileTap={{ scale: 0.93 }}
                animate={reduce ? undefined : { y: [0, -10, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                className="grid h-36 w-36 place-items-center rounded-blob bg-white/55 text-6xl shadow-float backdrop-blur-sm"
                aria-label="Open this note"
              >
                💌
              </motion.button>

              {/* The two of them, waiting either side of the envelope. */}
              <PigAndPenguin mood="waiting" size="1.9rem" className="mt-7" />

              <p className="mt-4 font-display text-[2rem] leading-tight tracking-[-0.03em]">
                {message.sender.displayName.split(' ')[0]} sent you something
              </p>
              <p className="mt-2 text-[0.95rem] opacity-70">Tap to open it</p>
            </motion.div>
          ) : (
            /* ── Opened ───────────────────────────────────────────────── */
            <motion.div
              key="opened"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
              className="flex flex-1 flex-col justify-center py-10"
            >
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-[0.8rem] font-bold uppercase tracking-[0.16em] opacity-60"
              >
                From {message.sender.displayName}
              </motion.p>

              <motion.blockquote
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.6 }}
                className="mt-4 font-display text-[1.9rem] leading-[1.28] tracking-[-0.02em]"
              >
                {message.body}
              </motion.blockquote>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 text-[0.82rem] opacity-55"
              >
                {new Date(message.createdAt).toLocaleString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="mt-5 flex items-center gap-2.5"
              >
                <span className="h-px flex-1 bg-current opacity-15" />
                <PigAndPenguin mood="together" size="1.5rem" />
                <span className="h-px flex-1 bg-current opacity-15" />
              </motion.div>

              {theirs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-5 flex flex-wrap gap-2"
                >
                  {theirs.map((r) => (
                    <span
                      key={r.id}
                      className="rounded-pill bg-white/50 px-3 py-1.5 text-[0.82rem] font-bold backdrop-blur-sm"
                    >
                      {r.reaction} {r.userName.split(' ')[0]}
                    </span>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reactions & reply ───────────────────────────────────────────── */}
        {opened && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="pb-4"
          >
            <div className="rounded-[1.75rem] bg-white/45 p-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-1">
                {REACTIONS.map((emoji) => {
                  const active = mine?.reaction === emoji;
                  return (
                    <motion.button
                      key={emoji}
                      type="button"
                      onClick={() => react(emoji)}
                      disabled={busy}
                      whileTap={{ scale: 0.85 }}
                      animate={active ? { scale: [1, 1.3, 1] } : {}}
                      transition={{ duration: 0.35 }}
                      aria-label={`React with ${emoji}`}
                      aria-pressed={active}
                      className={cn(
                        'grid h-11 flex-1 place-items-center rounded-2xl text-xl transition-colors',
                        active ? 'bg-white/80 shadow-soft' : 'hover:bg-white/40',
                      )}
                    >
                      {emoji}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/us/messages/new')}
              className="mt-3 grid h-13 w-full place-items-center rounded-pill bg-white/70 font-bold shadow-lift backdrop-blur-md transition-transform active:scale-[0.98]"
              style={{ color: bg.ink }}
            >
              Write back
            </button>
          </motion.div>
        )}
      </div>
    </MessageCanvas>
  );
}
