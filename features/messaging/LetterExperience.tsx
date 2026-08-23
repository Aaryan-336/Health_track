'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MessageCanvas } from '@/components/messages/MessageCanvas';
import { PigAndPenguin } from '@/components/messages/PigAndPenguin';
import { ApiError, post } from '@/lib/client/api';
import { resolveBackground } from '@/lib/backgrounds';
import { useUI } from '@/stores/ui';

type Letter = {
  id: string;
  triggerLabel: string;
  title: string;
  body: string;
  background: string;
  status: string;
  senderName: string;
  createdAt: string;
};

/**
 * An Open When letter. The seal is broken deliberately by the recipient, and
 * that act is recorded once — so the writer knows it landed.
 */
export function LetterExperience({
  letter,
  isRecipient,
}: {
  letter: Letter;
  isRecipient: boolean;
}) {
  const alreadyOpen = letter.status !== 'SEALED' || !isRecipient;
  const [opened, setOpened] = useState(alreadyOpen);
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const reduce = useReducedMotion();
  const bg = resolveBackground(letter.background);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    setOpened(true); // reveal immediately; recording is a background concern
    try {
      await post(`/open-when/${letter.id}/open`);
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not record that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MessageCanvas background={letter.background}>
      <div className="flex min-h-dvh flex-col px-6 pb-safe pt-safe">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/letters')}
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
            open when
          </span>
        </div>

        <AnimatePresence mode="wait">
          {!opened ? (
            <motion.div
              key="sealed"
              exit={{ opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
              transition={{ duration: 0.5 }}
              className="flex flex-1 flex-col items-center justify-center text-center"
            >
              <p className="mb-8 font-display text-[2.3rem] leading-[1.15] tracking-[-0.03em]">
                {letter.triggerLabel}
              </p>

              <motion.button
                type="button"
                onClick={open}
                whileTap={{ scale: 0.92 }}
                animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, -3, 3, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="grid h-40 w-40 place-items-center rounded-blob bg-white/55 text-7xl shadow-float backdrop-blur-sm"
                aria-label="Break the seal and read this letter"
              >
                ✉️
              </motion.button>

              <p className="mt-8 text-[0.95rem] font-semibold opacity-70">
                {letter.senderName.split(' ')[0]} wrote this for you
              </p>
              <p className="mt-1 text-[0.85rem] opacity-55">Tap to break the seal</p>
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.32, 0.72, 0, 1] }}
              className="flex-1 py-10"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-[0.78rem] font-bold uppercase tracking-[0.16em] opacity-55"
              >
                open when {letter.triggerLabel}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-3 font-display text-[2.1rem] leading-[1.15] tracking-[-0.03em]"
              >
                {letter.title}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.7 }}
                className="mt-6 whitespace-pre-wrap text-[1.1rem] leading-[1.75]"
              >
                {letter.body}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-10 font-display text-[1.15rem] opacity-70"
              >
                — {letter.senderName.split(' ')[0]}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95 }}
                className="mt-3"
              >
                <PigAndPenguin mood="together" size="1.35rem" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.05 }}
                className="mt-2 text-[0.78rem] opacity-45"
              >
                written{' '}
                {new Date(letter.createdAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MessageCanvas>
  );
}
