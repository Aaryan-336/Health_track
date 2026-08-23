'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Input, Textarea, Select } from '@/components/ui/Field';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProgressBar } from '@/components/ui/Progress';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, post } from '@/lib/client/api';
import { useCelebration } from '@/stores/celebration';
import { useUI } from '@/stores/ui';
import { cn } from '@/lib/cn';

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  status: string;
  targetRule: string;
  targetValue: number;
  startAt: string;
  endAt: string;
  myProgress: number;
  partnerProgress: number;
};

type Rule = 'DAILY_CHECK_IN' | 'HABIT_COMPLETIONS' | 'ACTIVITY_SESSIONS' | 'CUSTOM';

const RULE_COPY: Record<string, { label: string; unit: string }> = {
  DAILY_CHECK_IN: { label: 'Daily check-ins', unit: 'days' },
  HABIT_COMPLETIONS: { label: 'Habit completions', unit: 'completions' },
  ACTIVITY_SESSIONS: { label: 'Workouts', unit: 'sessions' },
  CUSTOM: { label: 'Something of your own', unit: 'times' },
};

const EMOJI_CHOICES = ['🔥', '💪', '🥗', '💧', '🚶', '🧘', '🌙', '⭐'];

const pct = (value: number, target: number) =>
  target <= 0 ? 0 : Math.min(100, Math.round((value / target) * 100));

const iso = (localDate: string) => new Date(`${localDate}T09:00:00`).toISOString();

const todayLocal = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const plusDays = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export function ChallengesScreen({
  challenges,
  partnerName,
}: {
  challenges: Challenge[];
  partnerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🔥');
  const [rule, setRule] = useState<Rule>('DAILY_CHECK_IN');
  const [target, setTarget] = useState(7);
  const [startDate, setStartDate] = useState(todayLocal);
  const [endDate, setEndDate] = useState(() => plusDays(7));

  const router = useRouter();
  const toast = useUI((s) => s.toast);
  const celebrate = useCelebration((s) => s.celebrate);
  const firstName = partnerName.split(' ')[0]!;

  const active = challenges.filter((c) => c.status === 'ACTIVE');
  const upcoming = challenges.filter((c) => c.status === 'UPCOMING');
  const past = challenges.filter((c) => c.status === 'COMPLETED' || c.status === 'EXPIRED');

  const create = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await post('/challenges', {
        title: title.trim(),
        description: description.trim() || undefined,
        emoji,
        startAt: iso(startDate),
        endAt: iso(endDate),
        targetRule: rule,
        targetValue: target,
      });
      setOpen(false);
      setTitle('');
      setDescription('');
      toast(`${firstName} has been told ${emoji}`, 'success', emoji);
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not start that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addProgress = async (c: Challenge) => {
    setBusy(true);
    try {
      await post(`/challenges/${c.id}/progress`, { increment: 1 });
      const bothDone = c.myProgress + 1 >= c.targetValue && c.partnerProgress >= c.targetValue;
      if (bothDone) {
        celebrate({ title: 'Challenge complete!', body: c.title, emoji: c.emoji });
      } else {
        toast(`${c.myProgress + 1} of ${c.targetValue}`, 'success', c.emoji);
      }
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not log that.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Challenges"
        subtitle="Something you both push towards, side by side, for a set number of days."
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Start a challenge"
            className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink shadow-soft"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        }
      />

      {challenges.length === 0 ? (
        <Empty
          emoji="🔥"
          title="No challenges yet"
          body="Pick something small and finite — seven days of water, a fortnight of walks — and see it through together."
          action={<Button onClick={() => setOpen(true)}>Start one</Button>}
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <Section title="Running now">
              {active.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  firstName={firstName}
                  busy={busy}
                  onProgress={addProgress}
                />
              ))}
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title="Starting soon">
              {upcoming.map((c) => (
                <ChallengeCard key={c.id} challenge={c} firstName={firstName} busy={busy} />
              ))}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="Finished">
              {past.map((c) => (
                <ChallengeCard key={c.id} challenge={c} firstName={firstName} busy={busy} />
              ))}
            </Section>
          )}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="A challenge"
        footer={
          <Button fullWidth size="lg" onClick={create} loading={busy} disabled={!title.trim()}>
            Start it
          </Button>
        }
      >
        <div className="space-y-4">
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

          <Field label="What are you both doing?">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Seven days of eight glasses"
              maxLength={100}
            />
          </Field>

          <Field label="Any details?" hint="Optional — the rules, or why it matters.">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="No excuses, and a photo of the last glass each night."
              maxLength={600}
              className="min-h-[5.5rem]"
            />
          </Field>

          <Field label="What counts">
            <Select value={rule} onChange={(e) => setRule(e.target.value as Rule)}>
              {Object.entries(RULE_COPY).map(([value, copy]) => (
                <option key={value} value={value}>
                  {copy.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={`Target each (${RULE_COPY[rule]!.unit})`}>
            <div className="flex items-center gap-3">
              <Stepper value={target} onChange={setTarget} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="Ends">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>

          <p className="text-[0.85rem] leading-relaxed text-muted">
            You each need {target} {RULE_COPY[rule]!.unit} for this to count as won — one of you
            racing ahead does not finish it.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-pill border border-line bg-raised p-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Fewer"
        className="grid h-9 w-9 place-items-center rounded-full bg-surface text-lg font-bold"
      >
        −
      </button>
      <span className="numeral w-10 text-center text-[1.15rem] font-bold">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(365, value + 1))}
        aria-label="More"
        className="grid h-9 w-9 place-items-center rounded-full bg-surface text-lg font-bold"
      >
        +
      </button>
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

function ChallengeCard({
  challenge,
  firstName,
  busy,
  onProgress,
}: {
  challenge: Challenge;
  firstName: string;
  busy: boolean;
  onProgress?: (c: Challenge) => void;
}) {
  const unit = RULE_COPY[challenge.targetRule]?.unit ?? 'times';
  const running = challenge.status === 'ACTIVE';
  const won = challenge.status === 'COMPLETED';
  const mineDone = challenge.myProgress >= challenge.targetValue;

  const daysLeft = Math.ceil((new Date(challenge.endAt).getTime() - Date.now()) / 86_400_000);
  const startsIn = Math.ceil((new Date(challenge.startAt).getTime() - Date.now()) / 86_400_000);

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        tone={won ? 'sage' : running ? 'honey' : 'plain'}
        className={cn(challenge.status === 'EXPIRED' && 'opacity-60')}
      >
        <div className="flex items-start gap-3.5">
          <span aria-hidden className="text-2xl">
            {challenge.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.2rem] leading-tight">{challenge.title}</p>
            {challenge.description && (
              <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted">
                {challenge.description}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Pill>
                {challenge.targetValue} {unit} each
              </Pill>
              {won && <Pill tone="sage">won together</Pill>}
              {running && daysLeft >= 0 && (
                <Pill tone={daysLeft <= 1 ? 'clay' : 'plain'}>
                  {daysLeft === 0 ? 'last day' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                </Pill>
              )}
              {challenge.status === 'UPCOMING' && (
                <Pill tone="sky">
                  {startsIn <= 0 ? 'starting' : `starts in ${startsIn} ${startsIn === 1 ? 'day' : 'days'}`}
                </Pill>
              )}
              {challenge.status === 'EXPIRED' && <Pill>ran out of time</Pill>}
            </div>
          </div>
        </div>

        {/* Two bars, never a merged one — the point is that you both show up. */}
        <div className="mt-4 space-y-3">
          <Track
            label="You"
            value={challenge.myProgress}
            target={challenge.targetValue}
            tone="accent"
          />
          <Track
            label={firstName}
            value={challenge.partnerProgress}
            target={challenge.targetValue}
            tone="blush"
          />
        </div>

        {running && onProgress && (
          <Button
            fullWidth
            variant={mineDone ? 'soft' : 'primary'}
            className="mt-4"
            disabled={busy}
            onClick={() => onProgress(challenge)}
          >
            {mineDone ? 'Add another anyway' : 'Log one for me'}
          </Button>
        )}
      </Card>
    </motion.div>
  );
}

function Track({
  label,
  value,
  target,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  tone: 'accent' | 'blush';
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[0.82rem] font-bold">{label}</span>
        <span className="numeral text-[0.82rem] text-muted">
          {value} / {target}
        </span>
      </div>
      <ProgressBar value={pct(value, target)} tone={tone} />
    </div>
  );
}
