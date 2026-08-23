'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { Avatar } from '@/components/ui/Avatar';
import { BlobBackdrop, HighlightBlob } from '@/components/ui/Blob';
import { Card, CardLabel, SectionHeader } from '@/components/ui/Card';
import { Empty, Pill } from '@/components/ui/Empty';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { ScoreDial } from '@/components/ui/ScoreDial';
import { WeekStrip } from '@/components/ui/WeekStrip';
import { MOOD_META } from '@/lib/scores/constants';
import type { HomeData } from './queries';
import { HabitRow } from './HabitRow';
import { InsightCard } from '@/features/insights/InsightCard';
import { ModeToggle } from '@/components/layout/ModeToggle';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const } },
};

export function HomeDashboard({
  data,
  greeting,
  displayName,
  avatarUrl,
}: {
  data: HomeData;
  greeting: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const firstName = displayName.split(' ')[0] ?? displayName;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="relative">
      <BlobBackdrop className="-z-10" />

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <motion.header variants={item} className="mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.86rem] font-bold text-muted">{greeting},</p>
          <h1 className="mt-0.5 truncate font-display text-[2.1rem] leading-[1.1] tracking-[-0.035em]">
            {firstName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ModeToggle />
          <Link href="/profile" aria-label="Your profile" className="rounded-full">
            <Avatar name={displayName} src={avatarUrl} size="md" />
          </Link>
        </div>
      </motion.header>

      <motion.div variants={item} className="mb-6">
        <WeekStrip days={data.week} selected={data.today} />
      </motion.div>

      {/* ── Health score ─────────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <Card tone="plain" className="grain overflow-visible pb-6 pt-7">
          <p className="text-center text-[0.9rem] font-bold text-muted">
            {firstName}, how are you doing today?
          </p>

          <ScoreDial
            score={data.score.score}
            caption="your health score"
            emptyLabel="Log something to begin your day"
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
            {data.streak.current > 0 && (
              <Pill tone="honey">
                🔥 {data.streak.current} day{data.streak.current === 1 ? '' : 's'}
              </Pill>
            )}
            {data.score.components
              .filter((c) => c.engaged)
              .slice(0, 3)
              .map((c) => (
                <Pill key={c.key}>
                  {c.label} · {c.detail}
                </Pill>
              ))}
          </div>
        </Card>
      </motion.section>

      {/* ── Daily highlights, as an organic cluster ──────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <SectionHeader
          title="Daily highlights"
          action={
            <Link href="/track" className="text-[0.82rem] font-bold text-muted hover:text-ink">
              Show all
            </Link>
          }
        />
        <p className="mb-4 px-1 text-[0.85rem] text-muted">
          Keep going — every small thing counts.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <HighlightBlob
            tone="sky"
            shape={0}
            emoji="💧"
            value={`${data.water.glasses}/${data.water.goalGlasses}`}
            label="water"
            onClick={() => location.assign('/track/water')}
          />
          <HighlightBlob
            tone="lilac"
            shape={1}
            emoji="🌱"
            value={`${data.habits.done}/${data.habits.total}`}
            label="habits"
            size="lg"
            onClick={() => location.assign('/track/habits')}
          />
          <HighlightBlob
            tone="clay"
            shape={2}
            emoji="🏃"
            value={`${data.activity.minutes}m`}
            label="moving"
            onClick={() => location.assign('/track/workouts')}
          />
          <HighlightBlob
            tone="sage"
            shape={3}
            emoji="🥗"
            value={`${data.meals.count}/${data.meals.goal}`}
            label="meals"
            size="sm"
            onClick={() => location.assign('/track/meals')}
          />
          <HighlightBlob
            tone="blush"
            shape={4}
            emoji={data.mood ? MOOD_META[data.mood.moodValue].emoji : '💗'}
            value={data.mood ? MOOD_META[data.mood.moodValue].label : '—'}
            label="mood"
            onClick={() => location.assign('/track/mood')}
          />
        </div>
      </motion.section>

      {/* ── Insight ──────────────────────────────────────────────────────── */}
      {data.insight && (
        <motion.section variants={item} className="mb-7">
          <InsightCard insight={data.insight} />
        </motion.section>
      )}

      {/* ── Habits ───────────────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <SectionHeader
          title="Today's habits"
          action={
            <Link href="/track/habits" className="text-[0.82rem] font-bold text-muted hover:text-ink">
              See all
            </Link>
          }
        />

        {data.habits.items.length === 0 ? (
          <Empty
            emoji="🌱"
            title="No habits yet"
            body="Add one or two small things you'd like to do most days."
            action={
              <Link
                href="/track/habits"
                className="inline-flex h-11 items-center rounded-pill bg-accent px-5 font-bold text-accent-ink"
              >
                Add a habit
              </Link>
            }
          />
        ) : (
          <div className="space-y-2">
            {data.habits.items.map((h) => (
              <HabitRow key={h.id} habit={h} />
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Active goals ─────────────────────────────────────────────────── */}
      <motion.section variants={item} className="mb-7">
        <SectionHeader
          title="Your goals"
          action={
            <Link href="/goals" className="text-[0.82rem] font-bold text-muted hover:text-ink">
              See all
            </Link>
          }
        />

        {data.goals.length === 0 ? (
          <Empty
            emoji="✨"
            title="Nothing on the go"
            body="Set a goal for yourself, or one to share with your partner."
            action={
              <Link
                href="/goals/new"
                className="inline-flex h-11 items-center rounded-pill bg-accent px-5 font-bold text-accent-ink"
              >
                Create a goal
              </Link>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {data.goals.map((g) => (
              <Link key={g.id} href={`/goals/${g.id}`} className="block">
                <Card className="flex items-center gap-3.5 p-4 transition-shadow hover:shadow-lift">
                  <span aria-hidden className="text-2xl">
                    {g.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold leading-tight">{g.title}</p>
                    <p className="mt-0.5 text-[0.8rem] text-muted">
                      {g.currentValue % 1 === 0 ? g.currentValue : g.currentValue.toFixed(1)} of{' '}
                      {g.targetValue} {g.unit}
                      {g.goalType === 'SHARED' && ' · together'}
                    </p>
                    <ProgressBar
                      value={g.percent}
                      height="sm"
                      className="mt-2"
                      tone={g.goalType === 'SHARED' ? 'blush' : 'accent'}
                    />
                  </div>
                  <ProgressRing value={g.percent} tone={g.goalType === 'SHARED' ? 'blush' : 'accent'}>
                    {g.percent}
                  </ProgressRing>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Partner update — only what they chose to share ───────────────── */}
      {data.hasPartner && data.partnerSnapshot && (
        <motion.section variants={item} className="mb-4">
          <SectionHeader title={`${data.partnerSnapshot.partner.displayName} today`} />

          {data.partnerSnapshot.nothingShared ? (
            <Card tone="plain" className="flex items-center gap-3.5">
              <Avatar
                name={data.partnerSnapshot.partner.displayName}
                src={data.partnerSnapshot.partner.avatarUrl}
                size="md"
              />
              <p className="text-[0.88rem] leading-snug text-muted">
                Nothing shared right now — and that&rsquo;s completely fine.
              </p>
            </Card>
          ) : (
            <Card tone="blush">
              <div className="mb-3 flex items-center gap-3">
                <Avatar
                  name={data.partnerSnapshot.partner.displayName}
                  src={data.partnerSnapshot.partner.avatarUrl}
                  size="sm"
                />
                <CardLabel>Shared with you</CardLabel>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.partnerSnapshot.items.map((i) => (
                  <Pill key={i.key} tone={i.tone}>
                    <span aria-hidden>{i.emoji}</span>
                    {i.value}
                  </Pill>
                ))}
              </div>
            </Card>
          )}
        </motion.section>
      )}

      {!data.hasPartner && (
        <motion.section variants={item}>
          <Card tone="lilac" className="text-center">
            <span className="text-3xl" aria-hidden>
              💞
            </span>
            <p className="mt-2 font-display text-[1.25rem]">Better with two</p>
            <p className="mx-auto mt-1 max-w-[20rem] text-[0.88rem] leading-relaxed text-muted">
              Connect with your partner to share goals, notes and little celebrations.
            </p>
            <Link
              href="/us"
              className="mt-4 inline-flex h-11 items-center rounded-pill bg-accent px-5 font-bold text-accent-ink"
            >
              Connect
            </Link>
          </Card>
        </motion.section>
      )}
    </motion.div>
  );
}
