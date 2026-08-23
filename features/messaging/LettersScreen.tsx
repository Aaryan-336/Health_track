'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BackgroundPicker } from '@/components/messages/BackgroundPicker';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Field, Input, Segmented, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, post } from '@/lib/client/api';
import { resolveBackground } from '@/lib/backgrounds';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type Letter = {
  id: string;
  triggerLabel: string;
  title: string;
  body: string | null;
  background: string;
  status: string;
  sealed: boolean;
  writtenByMe: boolean;
  senderName: string;
  createdAt: string;
  openedAt: string | null;
};

const TRIGGER_IDEAS = [
  'you have had a long day',
  'you cannot sleep',
  'you need a push',
  'you are missing me',
  'you are celebrating something',
  'you feel small',
  'it is raining',
];

export function LettersScreen({
  letters,
  partnerName,
}: {
  letters: Letter[];
  partnerName: string;
}) {
  const [tab, setTab] = useState<'forMe' | 'byMe'>('forMe');
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [triggerLabel, setTriggerLabel] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [background, setBackground] = useState('dusk');

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const firstName = partnerName.split(' ')[0];

  const forMe = letters.filter((l) => !l.writtenByMe);
  const byMe = letters.filter((l) => l.writtenByMe);
  const visible = tab === 'forMe' ? forMe : byMe;

  const create = async () => {
    if (!triggerLabel.trim() || !title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await post('/open-when', {
        triggerLabel: triggerLabel.trim(),
        title: title.trim(),
        body: body.trim(),
        background,
      });
      setComposing(false);
      setTriggerLabel('');
      setTitle('');
      setBody('');
      toast('Sealed and waiting', 'success', '✉️');
      setTab('byMe');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Open when…"
        subtitle="Letters written ahead of time, for the moment they are needed."
        action={
          <button
            type="button"
            onClick={() => setComposing(true)}
            aria-label="Write a letter"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        }
      />

      <Segmented
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'forMe', label: `For me (${forMe.length})` },
          { value: 'byMe', label: `I wrote (${byMe.length})` },
        ]}
      />

      {visible.length === 0 ? (
        <Empty
          emoji="✉️"
          title={tab === 'forMe' ? 'No letters yet' : 'You have not written any'}
          body={
            tab === 'forMe'
              ? `When ${firstName} writes one, it will wait here until you need it.`
              : `Write something for ${firstName} to find on a hard day, or a good one.`
          }
          action={
            tab === 'byMe' && <Button onClick={() => setComposing(true)}>Write a letter</Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((l, i) => (
            <LetterCard key={l.id} letter={l} index={i} />
          ))}
        </div>
      )}

      <Sheet
        open={composing}
        onClose={() => setComposing(false)}
        title="A letter for later"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={create}
            loading={busy}
            disabled={!triggerLabel.trim() || !title.trim() || !body.trim()}
          >
            Seal it
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Open when…" hint="Finish the sentence. This is all they see until they open it.">
            <Input
              value={triggerLabel}
              onChange={(e) => setTriggerLabel(e.target.value)}
              placeholder="you have had a long day"
              maxLength={80}
            />
          </Field>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {TRIGGER_IDEAS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTriggerLabel(t)}
                className="shrink-0 rounded-pill border border-line bg-surface px-3 py-1.5 text-[0.78rem] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-ink"
              >
                {t}
              </button>
            ))}
          </div>

          <Field label="Give it a title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Put this down and breathe"
              maxLength={100}
            />
          </Field>

          <Field label="What do you want them to read?">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Take your time. They will read this when they most need it."
              maxLength={5000}
              className="min-h-[10rem]"
            />
          </Field>

          <BackgroundPicker value={background} onChange={setBackground} label="Set the mood" />
        </div>
      </Sheet>
    </div>
  );
}

function LetterCard({ letter, index }: { letter: Letter; index: number }) {
  const bg = resolveBackground(letter.background);
  const reduce = useReducedMotion();
  const sealed = letter.sealed;

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.35), duration: 0.45 }}
      whileTap={sealed ? { scale: 0.97 } : undefined}
      className="relative h-full overflow-hidden rounded-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift"
      style={{ background: bg.gradient, color: bg.ink }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] opacity-60">Open when</p>
        <motion.span
          aria-hidden
          className="text-xl"
          animate={sealed && !reduce ? { rotate: [0, -8, 8, 0] } : undefined}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
        >
          {sealed ? '✉️' : '📖'}
        </motion.span>
      </div>

      <p className="mt-2 font-display text-[1.35rem] leading-tight">{letter.triggerLabel}</p>

      {sealed ? (
        <p className="mt-3 text-[0.84rem] font-semibold opacity-65">
          Sealed by {letter.senderName.split(' ')[0]} · tap to open
        </p>
      ) : (
        <>
          <p className="mt-2.5 text-[0.9rem] font-bold opacity-80">{letter.title}</p>
          <p className="mt-1.5 text-[0.8rem] opacity-60">
            {letter.writtenByMe
              ? letter.openedAt
                ? 'They have read this'
                : 'Waiting to be opened'
              : 'Opened — tap to read again'}
          </p>
        </>
      )}
    </motion.div>
  );

  // A letter you wrote that they have not opened has nothing to reveal.
  if (letter.writtenByMe && !letter.openedAt) {
    return <div className="h-full">{inner}</div>;
  }

  return (
    <Link href={`/letter/${letter.id}`} className="block h-full">
      {inner}
    </Link>
  );
}
