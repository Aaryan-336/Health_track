'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, post } from '@/lib/client/api';
import { useCelebration } from '@/stores/celebration';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type Promise_ = {
  id: string;
  title: string;
  promiseText: string;
  emoji: string;
  status: string;
  acceptedByMe: boolean;
  acceptedByPartner: boolean;
  creatorName: string;
  createdByMe: boolean;
};

const EMOJI_CHOICES = ['🤍', '🍽️', '🌙', '☎️', '🫂', '🌱', '⏳', '🎧'];

export function PromisesScreen({
  promises,
  partnerName,
}: {
  promises: Promise_[];
  partnerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState('🤍');

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const celebrate = useCelebration((s) => s.celebrate);
  const firstName = partnerName.split(' ')[0];

  const active = promises.filter((p) => p.status === 'ACTIVE');
  const proposed = promises.filter((p) => p.status === 'PROPOSED');
  const past = promises.filter((p) => p.status === 'COMPLETED' || p.status === 'ARCHIVED');

  const create = async () => {
    if (!title.trim() || !text.trim()) return;
    setBusy(true);
    try {
      await post('/promises', { title: title.trim(), promiseText: text.trim(), emoji });
      setOpen(false);
      setTitle('');
      setText('');
      toast(`Sent to ${firstName} to accept`, 'success', emoji);
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not save that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const act = async (p: Promise_, action: 'ACCEPT' | 'COMPLETE' | 'ARCHIVE') => {
    setBusy(true);
    try {
      await post(`/promises/${p.id}`, { action });
      if (action === 'ACCEPT' && p.acceptedByPartner) {
        celebrate({
          title: 'It’s official',
          body: `You both agreed: ${p.title}`,
          emoji: p.emoji,
        });
      } else if (action === 'COMPLETE') {
        celebrate({ title: 'A promise kept', body: p.title, emoji: p.emoji });
      } else {
        toast(action === 'ACCEPT' ? `Waiting on ${firstName}` : 'Archived', 'success', p.emoji);
      }
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not do that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Our promises"
        subtitle="Things you have both agreed to. Both of you have to say yes."
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Make a promise"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        }
      />

      {promises.length === 0 ? (
        <Empty
          emoji="🤍"
          title="No promises yet"
          body="A promise is something you both agree to hold. Neither of you can accept on the other's behalf."
          action={<Button onClick={() => setOpen(true)}>Make the first one</Button>}
        />
      ) : (
        <div className="space-y-6">
          {proposed.length > 0 && (
            <Section title="Waiting on a yes">
              {proposed.map((p) => (
                <PromiseCard key={p.id} promise={p} firstName={firstName} busy={busy} onAct={act} />
              ))}
            </Section>
          )}
          {active.length > 0 && (
            <Section title="Live between you">
              {active.map((p) => (
                <PromiseCard key={p.id} promise={p} firstName={firstName} busy={busy} onAct={act} />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Kept & archived">
              {past.map((p) => (
                <PromiseCard key={p.id} promise={p} firstName={firstName} busy={busy} onAct={act} />
              ))}
            </Section>
          )}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="A promise"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={create}
            loading={busy}
            disabled={!title.trim() || !text.trim()}
          >
            Propose it
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-[0.9rem] leading-relaxed text-muted">
            You&rsquo;re agreeing to this by proposing it. It becomes official once {firstName}{' '}
            accepts too.
          </p>

          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Pick a symbol
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  aria-pressed={emoji === e}
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-2xl border-2 text-xl transition-colors',
                    emoji === e ? 'border-accent bg-accent-soft' : 'border-line bg-surface',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <Field label="What is the promise?">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="No phones at dinner"
              maxLength={100}
            />
          </Field>

          <Field label="Say it properly">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="We eat together, properly, with the screens face down in another room."
              maxLength={1000}
              className="min-h-[7rem]"
            />
          </Field>
        </div>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 px-1 font-display text-[1.25rem]">{title}</h2>
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </div>
    </section>
  );
}

function PromiseCard({
  promise,
  firstName,
  busy,
  onAct,
}: {
  promise: Promise_;
  firstName: string;
  busy: boolean;
  onAct: (p: Promise_, a: 'ACCEPT' | 'COMPLETE' | 'ARCHIVE') => void;
}) {
  const done = promise.status === 'COMPLETED';
  const archived = promise.status === 'ARCHIVED';

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        tone={done ? 'sage' : promise.status === 'ACTIVE' ? 'blush' : 'plain'}
        className={cn(archived && 'opacity-60')}
      >
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="text-2xl">
            {promise.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.2rem] leading-tight">{promise.title}</p>
            <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">{promise.promiseText}</p>

            {/* Both sides shown separately — one person can never accept for two. */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill tone={promise.acceptedByMe ? 'sage' : 'plain'}>
                {promise.acceptedByMe ? '✓ you' : '· you'}
              </Pill>
              <Pill tone={promise.acceptedByPartner ? 'sage' : 'plain'}>
                {promise.acceptedByPartner ? `✓ ${firstName}` : `· ${firstName}`}
              </Pill>
              {done && <Pill tone="sage">kept</Pill>}
              {archived && <Pill>archived</Pill>}
            </div>
          </div>
        </div>

        {!done && !archived && (
          <div className="mt-4 flex gap-2">
            {!promise.acceptedByMe && (
              <Button className="flex-1" disabled={busy} onClick={() => onAct(promise, 'ACCEPT')}>
                I agree
              </Button>
            )}
            {promise.status === 'ACTIVE' && (
              <Button
                variant="soft"
                className="flex-1"
                disabled={busy}
                onClick={() => onAct(promise, 'COMPLETE')}
              >
                We kept it
              </Button>
            )}
            <Button variant="ghost" disabled={busy} onClick={() => onAct(promise, 'ARCHIVE')}>
              Archive
            </Button>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
