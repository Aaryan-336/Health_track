import { prisma } from '@/lib/db/client';
import { todayLocalDate, type LocalDate } from '@/lib/dates';
import { MOOD_META } from '@/lib/scores/constants';
import { computeActivityStreak } from '@/lib/scores/streaks';
import { getSharingMap, type SharingMap } from '@/lib/permissions/sharing';
import { isHabitScheduled } from '@/lib/scores/health';

/**
 * The one and only way one partner's health information reaches the other.
 *
 * Everything starts hidden. A field appears solely because the owner turned
 * that category on, and only at the detail level they chose. Nothing is
 * inferred from being in a couple, and the raw logs never leave this module.
 */

export type SharedItem = {
  key: string;
  label: string;
  value: string;
  tone: 'honey' | 'blush' | 'lilac' | 'sage' | 'sky' | 'clay';
  emoji: string;
};

export type PartnerSnapshot = {
  partner: { id: string; displayName: string; avatarUrl: string | null };
  localDate: LocalDate;
  items: SharedItem[];
  /** True when the partner has chosen to share nothing at all. */
  nothingShared: boolean;
};

export async function buildPartnerSnapshot(
  partner: { id: string; displayName: string; avatarUrl: string | null; timezone: string },
  viewerId: string,
): Promise<PartnerSnapshot> {
  // Guard: this must only ever be called for the viewer's actual partner.
  if (partner.id === viewerId) {
    throw new Error('buildPartnerSnapshot must not be used for the viewer themselves');
  }

  const map: SharingMap = await getSharingMap(partner.id);
  const localDate = todayLocalDate(partner.timezone);
  const items: SharedItem[] = [];

  // ── Health score ──────────────────────────────────────────────────────────
  if (map.HEALTH_SCORE !== 'NONE') {
    const score = await prisma.dailyScore.findUnique({
      where: { userId_localDate: { userId: partner.id, localDate } },
    });
    if (score) {
      items.push({
        key: 'score',
        label: 'Today',
        value:
          map.HEALTH_SCORE === 'SUMMARY'
            ? `${(score.score / 10).toFixed(1)} / 10`
            : score.score >= 70
              ? 'Having a good day'
              : score.score >= 40
                ? 'Getting there'
                : 'Taking it gently',
        tone: 'honey',
        emoji: '✨',
      });
    }
  }

  // ── Water ─────────────────────────────────────────────────────────────────
  if (map.WATER_DETAIL !== 'NONE' || map.WATER_TARGET !== 'NONE') {
    const [agg, profile] = await Promise.all([
      prisma.waterEntry.aggregate({
        where: { userId: partner.id, localDate },
        _sum: { amountMl: true },
      }),
      prisma.healthProfile.findUnique({ where: { userId: partner.id } }),
    ]);
    const totalMl = agg._sum.amountMl ?? 0;
    const goalMl = profile?.dailyWaterGoalMl ?? 2000;
    const glass = profile?.glassSizeMl ?? 250;

    if (map.WATER_DETAIL !== 'NONE') {
      items.push({
        key: 'water',
        label: 'Water',
        value: `${Math.round(totalMl / glass)} of ${Math.round(goalMl / glass)} glasses`,
        tone: 'sky',
        emoji: '💧',
      });
    } else if (map.WATER_TARGET !== 'NONE' && totalMl >= goalMl) {
      items.push({ key: 'water', label: 'Water', value: 'Goal reached', tone: 'sky', emoji: '💧' });
    }
  }

  // ── Movement ──────────────────────────────────────────────────────────────
  if (map.WORKOUTS !== 'NONE') {
    const activities = await prisma.activityEntry.findMany({
      where: { userId: partner.id, localDate },
      orderBy: { loggedAt: 'desc' },
    });
    if (activities.length) {
      items.push({
        key: 'movement',
        label: 'Movement',
        value:
          map.WORKOUTS === 'SUMMARY'
            ? `${activities[0]!.activityType} · ${activities.reduce((s, a) => s + a.durationMinutes, 0)} min`
            : 'Moved today',
        tone: 'clay',
        emoji: '🏃',
      });
    }
  }

  // ── Meals ─────────────────────────────────────────────────────────────────
  if (map.MEALS !== 'NONE') {
    const count = await prisma.mealEntry.count({ where: { userId: partner.id, localDate } });
    if (count > 0) {
      items.push({
        key: 'meals',
        label: 'Meals',
        value: map.MEALS === 'SUMMARY' ? `${count} logged` : 'Eating well',
        tone: 'sage',
        emoji: '🥗',
      });
    }
  }

  // ── Habits ────────────────────────────────────────────────────────────────
  if (map.HABITS !== 'NONE') {
    const [habits, completions] = await Promise.all([
      prisma.habit.findMany({ where: { ownerId: partner.id, active: true } }),
      prisma.habitCompletion.findMany({ where: { userId: partner.id, localDate } }),
    ]);
    const scheduled = habits.filter((h) => isHabitScheduled(h.frequencyRule, localDate));
    if (scheduled.length) {
      const done = new Set(completions.map((c) => c.habitId));
      const doneCount = scheduled.filter((h) => done.has(h.id)).length;
      items.push({
        key: 'habits',
        label: 'Habits',
        value:
          map.HABITS === 'SUMMARY'
            ? `${doneCount} of ${scheduled.length}`
            : doneCount > 0
              ? 'Keeping up'
              : 'Not yet today',
        tone: 'lilac',
        emoji: '🌱',
      });
    }
  }

  // ── Mood ──────────────────────────────────────────────────────────────────
  // Two consents must both hold: the category, and this specific entry.
  if (map.MOOD_STATUS !== 'NONE') {
    const mood = await prisma.moodEntry.findFirst({
      where: { userId: partner.id, localDate, shareMode: { not: 'PRIVATE' } },
      orderBy: { loggedAt: 'desc' },
    });
    if (mood) {
      const meta = MOOD_META[mood.moodValue];
      const canSeeNote =
        map.MOOD_NOTE !== 'NONE' && mood.shareMode === 'STATUS_AND_NOTE' && Boolean(mood.note);

      items.push({
        key: 'mood',
        label: 'Feeling',
        value: canSeeNote ? `${meta.label} — ${mood.note}` : meta.label,
        tone: meta.colour as SharedItem['tone'],
        emoji: meta.emoji,
      });
    }
  }

  // ── Streaks ───────────────────────────────────────────────────────────────
  if (map.STREAKS !== 'NONE') {
    const streak = await computeActivityStreak(prisma, partner.id, localDate);
    if (streak.current > 0) {
      items.push({
        key: 'streak',
        label: 'Streak',
        value:
          map.STREAKS === 'SUMMARY'
            ? `${streak.current} day${streak.current === 1 ? '' : 's'}`
            : 'On a streak',
        tone: 'honey',
        emoji: '🔥',
      });
    }
  }

  return {
    partner: { id: partner.id, displayName: partner.displayName, avatarUrl: partner.avatarUrl },
    localDate,
    items,
    nothingShared: items.length === 0,
  };
}
