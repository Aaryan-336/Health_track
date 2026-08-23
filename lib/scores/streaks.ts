import type { Tx } from '@/lib/db/client';
import { lastNLocalDates, shiftLocalDate, type LocalDate } from '@/lib/dates';

/**
 * Streaks are derived, never stored as a mutable counter — they are always
 * recomputed from the source logs so they can never drift out of sync.
 */

export type Streak = { current: number; longest: number; activeToday: boolean };

/**
 * Counts back from today. Today not yet being logged does not break a streak
 * that is still alive from yesterday — it is simply not extended yet.
 */
export function streakFromDates(dates: Iterable<LocalDate>, today: LocalDate): Streak {
  const set = new Set(dates);
  const activeToday = set.has(today);

  let current = 0;
  let cursor = activeToday ? today : shiftLocalDate(today, -1);
  while (set.has(cursor)) {
    current += 1;
    cursor = shiftLocalDate(cursor, -1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: LocalDate | null = null;
  for (const d of sorted) {
    run = prev && shiftLocalDate(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, activeToday };
}

const WINDOW = 400;

/** Days on which the user logged anything at all. */
export async function computeActivityStreak(
  db: Tx,
  userId: string,
  today: LocalDate,
): Promise<Streak> {
  const from = shiftLocalDate(today, -WINDOW);
  const where = { userId, localDate: { gte: from, lte: today } };

  const [water, meals, activity, moods, habits] = await Promise.all([
    db.waterEntry.findMany({ where, select: { localDate: true }, distinct: ['localDate'] }),
    db.mealEntry.findMany({ where, select: { localDate: true }, distinct: ['localDate'] }),
    db.activityEntry.findMany({ where, select: { localDate: true }, distinct: ['localDate'] }),
    db.moodEntry.findMany({ where, select: { localDate: true }, distinct: ['localDate'] }),
    db.habitCompletion.findMany({ where, select: { localDate: true }, distinct: ['localDate'] }),
  ]);

  const all = [...water, ...meals, ...activity, ...moods, ...habits].map((r) => r.localDate);
  return streakFromDates(all, today);
}

/** Days on which this specific habit was completed. */
export async function computeHabitStreak(
  db: Tx,
  habitId: string,
  today: LocalDate,
): Promise<Streak> {
  const rows = await db.habitCompletion.findMany({
    where: { habitId, localDate: { gte: shiftLocalDate(today, -WINDOW), lte: today } },
    select: { localDate: true },
    distinct: ['localDate'],
  });
  return streakFromDates(rows.map((r) => r.localDate), today);
}

/** Days on which the user completed their couple check-in. */
export async function computeCheckInStreak(
  db: Tx,
  userId: string,
  today: LocalDate,
): Promise<Streak> {
  const rows = await db.dailyCheckIn.findMany({
    where: {
      userId,
      status: 'DONE',
      localDate: { gte: shiftLocalDate(today, -WINDOW), lte: today },
    },
    select: { localDate: true },
  });
  return streakFromDates(rows.map((r) => r.localDate), today);
}

/** Days on which *both* partners checked in — the shared streak. */
export async function computeCoupleStreak(
  db: Tx,
  coupleId: string,
  userAId: string,
  userBId: string | null,
  today: LocalDate,
): Promise<Streak> {
  if (!userBId) return { current: 0, longest: 0, activeToday: false };

  const rows = await db.dailyCheckIn.findMany({
    where: {
      coupleId,
      status: 'DONE',
      localDate: { gte: shiftLocalDate(today, -WINDOW), lte: today },
    },
    select: { localDate: true, userId: true },
  });

  const byDate = new Map<LocalDate, Set<string>>();
  for (const r of rows) {
    if (!byDate.has(r.localDate)) byDate.set(r.localDate, new Set());
    byDate.get(r.localDate)!.add(r.userId);
  }

  const bothDays = [...byDate.entries()]
    .filter(([, users]) => users.has(userAId) && users.has(userBId))
    .map(([date]) => date);

  return streakFromDates(bothDays, today);
}

/** Last 7 local dates with a boolean for each — powers the little week strip. */
export function weekTrail(dates: Iterable<LocalDate>, today: LocalDate) {
  const set = new Set(dates);
  return lastNLocalDates(today, 7).map((d) => ({ localDate: d, done: set.has(d) }));
}
