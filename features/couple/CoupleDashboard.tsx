'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardLabel, SectionHeader } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { Field, Textarea } from '@/components/ui/Field';
import { ProgressBar } from '@/components/ui/Progress';
import { ScoreDial } from '@/components/ui/ScoreDial';
import { Sheet } from '@/components/ui/Sheet';
import { ApiError, post } from '@/lib/client/api';
import { resolveBackground } from '@/lib/backgrounds';
import { useUI } from '@/stores/ui';
import type { CoupleDashboard as Data } from './queries';
import { ConnectPanel } from './ConnectPanel';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const } },
};

export function CoupleDashboard({ data, firstName }: { data: Data; firstName: string }) {
  if (data.state === 'none' || data.state === 'pending') {
    return <ConnectPanel inviteCode={data.state === 'pending' ? data.inviteCode : null} />;
  }
  return <ActiveDashboard data={data} firstName={firstName} />;
}

function ActiveDashboard({
  data,
  firstName,
}: {
  data: Extract<Data, { state: 'active' }>;
  firstName: string;
}) {
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useUI((s) => s.toast);

  const partnerFirst = data.partner.displayName.split(' ')[0];
  const checkedIn = data.checkIn.mine?.status === 'DONE';

  const submitCheckIn = async () => {
    setBusy(true);
    try {
      await post('/couples/checkin', { status: 'DONE', note: note.trim() || undefined });
      setCheckInOpen(false);
      setNote('');
      toast('Checked in 💛', 'success', '💛');
      router.refresh();
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not check in.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="relative">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.header variants={item} className="mb-6">
        <p className="text-[0.86rem] font-bold text-muted">The two of you</p>
        <h1 className="mt-0.5 font-display text-[2.1rem] leading-[1.1] tracking-[-0.035em]">
          {data.couple.title ?? `${firstName} & ${partnerFirst}`}
        </h1>
        {data.couple.daysTogether !== null && (
          <p className="mt-1 text-[0.85rem] text-muted">
            {data.couple.daysTogether.toLocaleString()} days together
          </p>
        )}
      </motion.header>

      {/* ── Couple score ─────────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <Card className="grain overflow-visible pb-6 pt-7">
          <p className="text-center text-[0.9rem] font-bold text-muted">How you&rsquo;re doing together</p>

          <ScoreDial
            score={data.score.value}
            caption="your couple score"
            emptyLabel="Check in to start your day together"
            segments={data.score.components.map((c) => ({
              key: c.key,
              label: c.label,
              ratio: c.ratio,
              engaged: c.engaged,
              colour: c.key,
            }))}
            className="-mb-2 mt-1"
          />

          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {data.score.streak.current > 0 && (
              <Pill tone="blush">
                🔥 {data.score.streak.current} day{data.score.streak.current === 1 ? '' : 's'} in a row
              </Pill>
            )}
            {data.score.components
              .filter((c) => c.engaged)
              .slice(0, 2)
              .map((c) => (
                <Pill key={c.key}>{c.detail}</Pill>
              ))}
          </div>
        </Card>
      </motion.section>

      {/* ── Daily check-in ───────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <Card tone={checkedIn ? 'sage' : 'accent'}>
          <div className="flex items-center gap-3">
            <Avatar name={data.partner.displayName} src={data.partner.avatarUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[1.25rem] leading-tight">Today&rsquo;s check-in</p>
              <p className="mt-0.5 text-[0.84rem] text-muted">
                {checkedIn && data.checkIn.partnerDone
                  ? 'You have both checked in.'
                  : checkedIn
                    ? `Waiting on ${partnerFirst}.`
                    : data.checkIn.partnerDone
                      ? `${partnerFirst} has checked in.`
                      : 'Neither of you yet.'}
              </p>
            </div>
          </div>

          {data.checkIn.partnerNote && (
            <p className="mt-3 rounded-2xl bg-surface/70 px-4 py-3 text-[0.9rem] italic leading-relaxed">
              &ldquo;{data.checkIn.partnerNote}&rdquo; — {partnerFirst}
            </p>
          )}

          {!checkedIn && (
            <Button fullWidth className="mt-4" onClick={() => setCheckInOpen(true)}>
              Check in
            </Button>
          )}
        </Card>
      </motion.section>

      {/* ── Latest note ──────────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <SectionHeader
          title="Little notes"
          action={
            <Link href="/us/messages" className="text-[0.82rem] font-bold text-muted hover:text-ink">
              See all
            </Link>
          }
        />

        {data.latestMessage ? (
          <Link href={`/message/${data.latestMessage.id}`} className="block">
            <div
              className="overflow-hidden rounded-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              style={{
                background: resolveBackground(data.latestMessage.background).gradient,
                color: resolveBackground(data.latestMessage.background).ink,
              }}
            >
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.13em] opacity-60">
                {data.latestMessage.fromMe
                  ? 'You wrote'
                  : `${data.latestMessage.senderName.split(' ')[0]} wrote`}
              </p>
              <p className="mt-2 font-display text-[1.25rem] leading-snug">
                {data.latestMessage.body.length > 120
                  ? `${data.latestMessage.body.slice(0, 117)}…`
                  : data.latestMessage.body}
              </p>
            </div>
          </Link>
        ) : (
          <Empty
            emoji="💌"
            title="No notes yet"
            body={`Write something small for ${partnerFirst}.`}
            action={
              <Link
                href="/us/messages/new"
                className="inline-flex h-11 items-center rounded-pill bg-accent px-5 font-bold text-accent-ink"
              >
                Write a note
              </Link>
            }
          />
        )}
      </motion.section>

      {/* ── Shared goals ─────────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <SectionHeader
          title="Shared goals"
          action={
            <Link href="/goals" className="text-[0.82rem] font-bold text-muted hover:text-ink">
              See all
            </Link>
          }
        />

        {data.sharedGoals.length === 0 ? (
          <Empty
            emoji="🌳"
            title="Nothing shared yet"
            body="Pick something to work towards together."
            action={
              <Link
                href="/goals/new"
                className="inline-flex h-11 items-center rounded-pill bg-accent px-5 font-bold text-accent-ink"
              >
                Create a shared goal
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {data.sharedGoals.map((g) => (
              <Link key={g.id} href={`/goals/${g.id}`} className="block">
                <Card className="transition-shadow hover:shadow-lift">
                  <div className="flex items-center gap-3.5">
                    <span aria-hidden className="text-2xl">
                      {g.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold leading-tight">{g.title}</p>
                      <p className="mt-0.5 text-[0.8rem] text-muted">
                        {g.currentValue} of {g.targetValue} {g.unit}
                      </p>
                      <ProgressBar value={g.percent} height="sm" tone="blush" className="mt-2" />
                    </div>
                    <span className="numeral shrink-0 text-[1rem] font-bold">{g.percent}%</span>
                  </div>
                  {g.nextMilestone && (
                    <p className="mt-2.5 text-[0.78rem] text-faint">
                      Next: {g.nextMilestone.label} at {g.nextMilestone.thresholdPct}%
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Challenge ────────────────────────────────────────────────────── */}
      {data.challenge && (
        <motion.section variants={item} className="mb-7">
          <SectionHeader
            title="Current challenge"
            action={
              <Link href="/us/challenges" className="text-[0.82rem] font-bold text-muted hover:text-ink">
                See all
              </Link>
            }
          />
          <Link href="/us/challenges" className="block">
            <Card tone="honey" className="transition-shadow hover:shadow-lift">
              <div className="flex items-center gap-3">
                <span aria-hidden className="text-2xl">
                  {data.challenge.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[1.2rem] leading-tight">{data.challenge.title}</p>
                  <p className="mt-0.5 text-[0.8rem] text-muted">
                    ends{' '}
                    {new Date(data.challenge.endAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div>
                  <div className="mb-1 flex justify-between text-[0.78rem] font-bold">
                    <span>You</span>
                    <span>
                      {data.challenge.myProgress} / {data.challenge.targetValue}
                    </span>
                  </div>
                  <ProgressBar
                    value={(data.challenge.myProgress / data.challenge.targetValue) * 100}
                    height="sm"
                    tone="honey"
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[0.78rem] font-bold">
                    <span>{partnerFirst}</span>
                    <span>
                      {data.challenge.partnerProgress} / {data.challenge.targetValue}
                    </span>
                  </div>
                  <ProgressBar
                    value={(data.challenge.partnerProgress / data.challenge.targetValue) * 100}
                    height="sm"
                    tone="blush"
                  />
                </div>
              </div>
            </Card>
          </Link>
        </motion.section>
      )}

      {/* ── What they shared ─────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <SectionHeader title={`${partnerFirst} today`} />
        {data.snapshot.nothingShared ? (
          <Card className="flex items-center gap-3.5">
            <Avatar name={data.partner.displayName} src={data.partner.avatarUrl} size="md" />
            <p className="text-[0.88rem] leading-snug text-muted">
              {partnerFirst} isn&rsquo;t sharing anything right now — and that&rsquo;s completely fine.
            </p>
          </Card>
        ) : (
          <Card tone="blush">
            <CardLabel>Shared with you</CardLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.snapshot.items.map((i) => (
                <Pill key={i.key} tone={i.tone}>
                  <span aria-hidden>{i.emoji}</span>
                  {i.value}
                </Pill>
              ))}
            </div>
          </Card>
        )}
      </motion.section>

      {/* ── Quick links ──────────────────────────────────────────────────── */}
      <motion.section variants={item}>
        <div className="grid grid-cols-2 gap-3">
          <QuickLink
            href="/letters"
            emoji="✉️"
            label="Open when…"
            hint={
              data.counts.sealedLetters > 0
                ? `${data.counts.sealedLetters} sealed for you`
                : 'Letters for later'
            }
            tone="lilac"
            badge={data.counts.sealedLetters > 0}
          />
          <QuickLink
            href="/us/promises"
            emoji="🤍"
            label="Our promises"
            hint={`${data.counts.promises} active`}
            tone="sage"
          />
          <QuickLink
            href="/us/memories"
            emoji="📸"
            label="Memories"
            hint={`${data.counts.memories} saved`}
            tone="honey"
          />
          <QuickLink href="/us/challenges" emoji="🔥" label="Challenges" hint="Push each other" tone="clay" />
        </div>
      </motion.section>

      <Sheet
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        title="Check in"
        footer={
          <Button fullWidth size="lg" onClick={submitCheckIn} loading={busy}>
            Check in for today
          </Button>
        }
      >
        <p className="mb-4 text-[0.92rem] leading-relaxed text-muted">
          A daily hello. {partnerFirst} will know you thought of them.
        </p>
        <Field label="Add a note (optional)">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thinking of you today 💛"
            maxLength={300}
            className="min-h-[5rem]"
          />
        </Field>
      </Sheet>
    </motion.div>
  );
}

function QuickLink({
  href,
  emoji,
  label,
  hint,
  tone,
  badge,
}: {
  href: string;
  emoji: string;
  label: string;
  hint: string;
  tone: 'lilac' | 'sage' | 'honey' | 'clay';
  badge?: boolean;
}) {
  return (
    <Link href={href}>
      <Card tone={tone} className="relative h-full transition-shadow hover:shadow-lift">
        {badge && (
          <span
            aria-hidden
            className="absolute right-4 top-4 h-2.5 w-2.5 animate-pulse-soft rounded-full bg-blush"
          />
        )}
        <span className="text-2xl" aria-hidden>
          {emoji}
        </span>
        <p className="mt-2 font-display text-[1.1rem] leading-tight">{label}</p>
        <p className="mt-0.5 text-[0.78rem] text-muted">{hint}</p>
      </Card>
    </Link>
  );
}
