import type { Tx } from '@/lib/db/client';
import { endOfLocalDayUtc, startOfLocalDayUtc, type LocalDate } from '@/lib/dates';
import { computeCoupleStreak } from './streaks';

/**
 * Couple score — a warmth measure of the shared space, never a surveillance
 * metric. It is built only from *shared* artefacts (check-ins, shared goals,
 * messages, promises, challenges) and never reads either partner's private
 * health logs.
 */

export type CoupleComponent = {
  key: 'connection' | 'sharedGoals' | 'exchanges' | 'commitment';
  label: string;
  weight: number;
  ratio: number;
  engaged: boolean;
  detail: string;
};

export type CoupleScoreResult = {
  localDate: LocalDate;
  score: number | null;
  components: CoupleComponent[];
  streak: { current: number; longest: number; activeToday: boolean };
};

const WEIGHTS = { connection: 35, sharedGoals: 25, exchanges: 20, commitment: 20 } as const;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export async function computeCoupleScore(
  db: Tx,
  coupleId: string,
  localDate: LocalDate,
  timezone: string,
): Promise<CoupleScoreResult> {
  const couple = await db.coupleRelationship.findUnique({ where: { id: coupleId } });
  if (!couple) {
    return { localDate, score: null, components: [], streak: { current: 0, longest: 0, activeToday: false } };
  }

  const dayStart = startOfLocalDayUtc(localDate, timezone);
  const dayEnd = endOfLocalDayUtc(localDate, timezone);

  const [checkIns, sharedGoals, messages, promises, challenges, streak] = await Promise.all([
    db.dailyCheckIn.findMany({ where: { coupleId, localDate, status: 'DONE' } }),
    db.goal.findMany({
      where: { coupleId, goalType: 'SHARED', status: 'ACTIVE', deletedAt: null },
      select: { currentValue: true, targetValue: true },
    }),
    db.message.count({
      where: { coupleId, createdAt: { gte: dayStart, lt: dayEnd }, deletedAt: null },
    }),
    db.promise.findMany({ where: { coupleId, status: 'ACTIVE' }, select: { id: true } }),
    db.challenge.findMany({
      where: { coupleId, status: 'ACTIVE' },
      select: { progressA: true, progressB: true, targetValue: true },
    }),
    computeCoupleStreak(db, coupleId, couple.userAId, couple.userBId, localDate),
  ]);

  const checkedIn = new Set(checkIns.map((c) => c.userId));
  const bothPresent = Boolean(couple.userBId);
  const connectionRatio = bothPresent
    ? (checkedIn.has(couple.userAId) ? 0.5 : 0) + (checkedIn.has(couple.userBId!) ? 0.5 : 0)
    : 0;

  const goalRatio = sharedGoals.length
    ? sharedGoals.reduce(
        (sum, g) => sum + clamp01(g.currentValue / Math.max(1, g.targetValue)),
        0,
      ) / sharedGoals.length
    : 0;

  const challengeRatio = challenges.length
    ? challenges.reduce(
        (sum, c) =>
          sum + clamp01((c.progressA + c.progressB) / Math.max(1, c.targetValue * 2)),
        0,
      ) / challenges.length
    : 0;

  const components: CoupleComponent[] = [
    {
      key: 'connection',
      label: 'Daily check-in',
      weight: WEIGHTS.connection,
      ratio: connectionRatio,
      engaged: bothPresent,
      detail:
        connectionRatio === 1
          ? 'Both of you checked in'
          : connectionRatio > 0
            ? 'One of you checked in'
            : 'No check-ins yet',
    },
    {
      key: 'sharedGoals',
      label: 'Shared goals',
      weight: WEIGHTS.sharedGoals,
      ratio: goalRatio,
      engaged: sharedGoals.length > 0,
      detail: `${sharedGoals.length} active`,
    },
    {
      key: 'exchanges',
      label: 'Little notes',
      weight: WEIGHTS.exchanges,
      ratio: clamp01(messages / 2),
      engaged: messages > 0,
      detail: messages === 1 ? '1 note today' : `${messages} notes today`,
    },
    {
      key: 'commitment',
      label: 'Promises & challenges',
      weight: WEIGHTS.commitment,
      ratio: clamp01((promises.length ? 0.5 : 0) + challengeRatio * 0.5),
      engaged: promises.length > 0 || challenges.length > 0,
      detail: `${promises.length} promises · ${challenges.length} challenges`,
    },
  ];

  const engaged = components.filter((c) => c.engaged);
  if (engaged.length === 0) {
    return { localDate, score: null, components, streak };
  }

  const totalWeight = engaged.reduce((s, c) => s + c.weight, 0);
  const earned = engaged.reduce((s, c) => s + c.weight * c.ratio, 0);

  return {
    localDate,
    score: Math.round((earned / totalWeight) * 100),
    components,
    streak,
  };
}

export async function recalcCoupleScore(
  db: Tx,
  coupleId: string,
  localDate: LocalDate,
  timezone: string,
): Promise<CoupleScoreResult> {
  const result = await computeCoupleScore(db, coupleId, localDate, timezone);

  if (result.score === null) {
    await db.coupleScore.deleteMany({ where: { coupleId, localDate } });
    return result;
  }

  await db.coupleScore.upsert({
    where: { coupleId_localDate: { coupleId, localDate } },
    create: {
      coupleId,
      localDate,
      score: result.score,
      componentJson: result.components as unknown as object,
    },
    update: {
      score: result.score,
      componentJson: result.components as unknown as object,
      calculatedAt: new Date(),
    },
  });

  return result;
}
