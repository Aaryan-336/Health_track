'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardLabel } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Textarea } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, post } from '@/lib/client/api';
import { formatLocalDate } from '@/lib/dates';
import { MOOD_META, MOOD_ORDER, MOOD_SCALE, STRESS_LABELS } from '@/lib/scores/constants';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type MoodType = keyof typeof MOOD_META;
type ShareMode = 'PRIVATE' | 'STATUS_ONLY' | 'STATUS_AND_NOTE';
type Entry = {
  id: string;
  moodValue: MoodType;
  stressValue: number;
  note: string | null;
  shareMode: ShareMode;
  localDate: string;
  loggedAt: string;
};

export function MoodTracker({
  initial,
  today,
  hasPartner,
  partnerName,
  moodSharingOn,
}: {
  initial: Entry[];
  today: string;
  hasPartner: boolean;
  partnerName: string | null;
  moodSharingOn: boolean;
}) {
  const [entries, setEntries] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<MoodType>('GOOD');
  const [stress, setStress] = useState(3);
  const [note, setNote] = useState('');
  const [shareMode, setShareMode] = useState<ShareMode>('PRIVATE');
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const todayEntry = entries.find((e) => e.localDate === today);

  // The four-bar breakdown from the reference journal screen.
  const breakdown = useMemo(() => {
    const buckets = [
      { label: 'Happy', tone: 'bg-honey', match: (m: MoodType) => MOOD_SCALE[m] >= 6 },
      { label: 'Steady', tone: 'bg-sage', match: (m: MoodType) => MOOD_SCALE[m] === 5 },
      { label: 'Okay', tone: 'bg-clay', match: (m: MoodType) => MOOD_SCALE[m] === 4 },
      { label: 'Low', tone: 'bg-lilac', match: (m: MoodType) => MOOD_SCALE[m] <= 3 },
    ];
    const total = entries.length || 1;
    return buckets.map((b) => ({
      ...b,
      pct: Math.round((entries.filter((e) => b.match(e.moodValue)).length / total) * 100),
    }));
  }, [entries]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await post<{ entry: Entry }>('/moods', {
        moodValue: mood,
        stressValue: stress,
        note: note.trim() || undefined,
        shareMode,
      });
      setEntries((prev) => [res.entry, ...prev.filter((e) => e.id !== res.entry.id)]);
      setNote('');
      setOpen(false);
      toast('Thanks for checking in', 'success', MOOD_META[mood].emoji);
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
        title="How are you?"
        subtitle="Private unless you say otherwise."
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            Check in
          </Button>
        }
      />

      {todayEntry ? (
        <Card tone="blush" className="mb-5 text-center">
          <CardLabel>Today</CardLabel>
          <span className="mt-2 block text-5xl" aria-hidden>
            {MOOD_META[todayEntry.moodValue].emoji}
          </span>
          <p className="mt-2 font-display text-[1.6rem] leading-tight">
            {MOOD_META[todayEntry.moodValue].label}
          </p>
          <p className="mt-1 text-[0.86rem] text-muted">
            {STRESS_LABELS[todayEntry.stressValue - 1]}
          </p>
          {todayEntry.note && (
            <p className="mx-auto mt-3 max-w-[22rem] text-[0.9rem] italic leading-relaxed text-muted">
              &ldquo;{todayEntry.note}&rdquo;
            </p>
          )}
          <div className="mt-3 flex justify-center">
            <Pill tone={todayEntry.shareMode === 'PRIVATE' ? 'plain' : 'sage'}>
              {todayEntry.shareMode === 'PRIVATE'
                ? '🔒 Just for you'
                : todayEntry.shareMode === 'STATUS_ONLY'
                  ? '👀 Mood shared'
                  : '💬 Mood and note shared'}
            </Pill>
          </div>
        </Card>
      ) : (
        <Card tone="blush" className="mb-5 text-center">
          <span className="text-4xl" aria-hidden>
            💗
          </span>
          <p className="mt-2 font-display text-[1.4rem]">Not checked in yet</p>
          <p className="mx-auto mt-1 max-w-[20rem] text-[0.88rem] text-muted">
            It takes ten seconds, and it helps you notice patterns later.
          </p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            Check in now
          </Button>
        </Card>
      )}

      {entries.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-1 px-1 font-display text-[1.35rem]">Your last two weeks</h2>
          <p className="mb-4 px-1 text-[0.85rem] text-muted">
            How your check-ins have looked lately.
          </p>

          <Card>
            <div className="flex h-40 items-end justify-around gap-3">
              {breakdown.map((b) => (
                <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="numeral text-[0.9rem]">{b.pct}%</span>
                  <div className="flex h-full w-full items-end overflow-hidden rounded-pill bg-line/50">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(4, b.pct)}%` }}
                      transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                      className={cn('w-full rounded-pill', b.tone)}
                    />
                  </div>
                  <span className="text-[0.72rem] font-bold text-muted">{b.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-2.5 px-1 font-display text-[1.35rem]">Recent check-ins</h2>
        {entries.length === 0 ? (
          <Empty emoji="💗" title="No check-ins yet" body="Your history will build up here." />
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 14).map((e) => (
              <Card key={e.id} className="flex items-center gap-3.5 p-3.5">
                <span aria-hidden className="text-2xl">
                  {MOOD_META[e.moodValue].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-tight">{MOOD_META[e.moodValue].label}</p>
                  <p className="mt-0.5 text-[0.78rem] text-muted">
                    {formatLocalDate(e.localDate, 'EEE d MMM')} · {STRESS_LABELS[e.stressValue - 1]}
                  </p>
                  {e.note && <p className="mt-1 truncate text-[0.8rem] italic text-muted">{e.note}</p>}
                </div>
                {e.shareMode === 'PRIVATE' && (
                  <span aria-label="Private" title="Private" className="text-sm opacity-50">
                    🔒
                  </span>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="How are you feeling?"
        footer={
          <Button fullWidth size="lg" onClick={save} loading={busy}>
            Save check-in
          </Button>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2.5 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Right now
            </p>
            <div className="flex justify-between gap-1">
              {MOOD_ORDER.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  aria-pressed={mood === m}
                  aria-label={MOOD_META[m].label}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 transition-all duration-200',
                    mood === m ? 'scale-105 bg-accent-soft' : 'opacity-45 hover:opacity-80',
                  )}
                >
                  <span className="text-2xl" aria-hidden>
                    {MOOD_META[m].emoji}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-center font-display text-[1.2rem]">{MOOD_META[mood].label}</p>
          </div>

          <div>
            <p className="mb-2 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Stress level
            </p>
            <input
              type="range"
              min={1}
              max={5}
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="w-full accent-[rgb(var(--c-accent))]"
              aria-label="Stress level"
            />
            <p className="mt-1 text-center text-[0.9rem] font-bold">{STRESS_LABELS[stress - 1]}</p>
          </div>

          <Field label="Anything you want to note?" hint="Optional — for you, unless you share it.">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Busy day, but a good one."
              maxLength={500}
              className="min-h-[5rem]"
            />
          </Field>

          {/* Per-entry consent, defaulting to private every single time. */}
          <div className="rounded-2xl border border-line bg-raised p-3.5">
            <p className="mb-2.5 text-[0.78rem] font-bold uppercase tracking-[0.1em] text-muted">
              Who can see this
            </p>
            <div className="space-y-1.5">
              {(
                [
                  { value: 'PRIVATE', label: 'Just me', hint: 'Nobody else sees this.', emoji: '🔒' },
                  {
                    value: 'STATUS_ONLY',
                    label: 'Share how I feel',
                    hint: partnerName ? `${partnerName} sees the mood, not the note.` : 'Mood only.',
                    emoji: '👀',
                  },
                  {
                    value: 'STATUS_AND_NOTE',
                    label: 'Share the note too',
                    hint: partnerName ? `${partnerName} sees both.` : 'Mood and note.',
                    emoji: '💬',
                  },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setShareMode(o.value)}
                  disabled={o.value !== 'PRIVATE' && !hasPartner}
                  aria-pressed={shareMode === o.value}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-40',
                    shareMode === o.value ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-surface',
                  )}
                >
                  <span aria-hidden>{o.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9rem] font-bold leading-tight">{o.label}</span>
                    <span className="mt-0.5 block text-[0.78rem] leading-snug text-muted">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {hasPartner && shareMode !== 'PRIVATE' && !moodSharingOn && (
              <p className="mt-2.5 rounded-xl bg-honey-soft px-3 py-2 text-[0.78rem] leading-snug">
                Mood sharing is currently switched off in your{' '}
                <Link href="/profile/privacy" className="font-bold underline">
                  privacy settings
                </Link>
                , so this stays private until you turn it on.
              </p>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
