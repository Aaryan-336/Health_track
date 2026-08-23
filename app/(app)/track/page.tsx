import Link from 'next/link';
import type { Metadata } from 'next';

import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProgressBar } from '@/components/ui/Progress';
import { requireUser } from '@/lib/permissions';
import { getHomeData } from '@/features/tracking/queries';

export const metadata: Metadata = { title: 'Track' };
export const dynamic = 'force-dynamic';

export default async function TrackHubPage() {
  const user = await requireUser();
  const d = await getHomeData(user);

  const tiles = [
    {
      href: '/track/water',
      label: 'Water',
      emoji: '💧',
      tone: 'sky' as const,
      value: `${d.water.glasses} of ${d.water.goalGlasses} glasses`,
      pct: Math.min(100, (d.water.totalMl / d.water.goalMl) * 100),
    },
    {
      href: '/track/meals',
      label: 'Meals',
      emoji: '🥗',
      tone: 'sage' as const,
      value: `${d.meals.count} of ${d.meals.goal} logged`,
      pct: Math.min(100, (d.meals.count / d.meals.goal) * 100),
    },
    {
      href: '/track/workouts',
      label: 'Movement',
      emoji: '🏃',
      tone: 'clay' as const,
      value: `${d.activity.minutes} of ${d.activity.goal} min`,
      pct: Math.min(100, (d.activity.minutes / d.activity.goal) * 100),
    },
    {
      href: '/track/habits',
      label: 'Habits',
      emoji: '🌱',
      tone: 'lilac' as const,
      value: `${d.habits.done} of ${d.habits.total} done`,
      pct: d.habits.total ? (d.habits.done / d.habits.total) * 100 : 0,
    },
    {
      href: '/track/mood',
      label: 'Mood',
      emoji: '💗',
      tone: 'blush' as const,
      value: d.mood ? 'Checked in today' : 'Not yet today',
      pct: d.mood ? 100 : 0,
    },
    {
      href: '/track/journal',
      label: 'Journal',
      emoji: '📖',
      tone: 'honey' as const,
      value: 'Write something down',
      pct: 0,
    },
  ];

  return (
    <div>
      <PageHeader title="Today" subtitle="Everything you're keeping an eye on." back={false} />

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card tone={t.tone} className="h-full transition-shadow hover:shadow-lift">
              <span className="text-2xl" aria-hidden>
                {t.emoji}
              </span>
              <p className="mt-2 font-display text-[1.15rem] leading-tight">{t.label}</p>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-muted">{t.value}</p>
              {t.pct > 0 && <ProgressBar value={t.pct} height="sm" tone={t.tone} className="mt-3" />}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
