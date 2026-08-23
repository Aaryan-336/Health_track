import type { InsightType, User } from '@prisma/client';

import { prisma } from '@/lib/db/client';
import { lastNLocalDates, todayLocalDate, type LocalDate } from '@/lib/dates';
import { rephrase, SYSTEM_PROMPT } from '@/lib/ai/provider';
import { numbersAreGrounded, validateInsightCopy } from '@/lib/ai/safety';
import { goalPercent } from '@/features/goals/progress';

/**
 * Personalised insights.
 *
 * The pipeline from the docs: aggregate the user's own data → a deterministic
 * rules engine finds candidate trends → the model turns validated evidence into
 * friendlier language → a safety validator rejects anything unsupported. The
 * numbers are never generated; only the wording is.
 *
 * A user's context contains only their own data plus shared goals. A partner's
 * private logs never enter it.
 */

type Candidate = {
  type: InsightType;
  title: string;
  body: string;
  evidence: Record<string, number | string>;
  numbers: number[];
  confidence: 'high' | 'medium';
};

async function gather(user: User, today: LocalDate) {
  const thisWeek = lastNLocalDates(today, 7);
  const lastWeek = lastNLocalDates(thisWeek[0]!, 8).slice(0, 7);

  const inRange = (dates: LocalDate[]) => ({
    userId: user.id,
    localDate: { gte: dates[0]!, lte: dates[dates.length - 1]! },
  });

  const [
    habitsThis,
    habitsLast,
    waterThisDays,
    waterLastDays,
    activityThis,
    activityLast,
    moods,
    goals,
    scores,
  ] = await Promise.all([
    prisma.habitCompletion.count({ where: inRange(thisWeek) }),
    prisma.habitCompletion.count({ where: inRange(lastWeek) }),
    prisma.waterEntry.findMany({
      where: inRange(thisWeek),
      select: { localDate: true },
      distinct: ['localDate'],
    }),
    prisma.waterEntry.findMany({
      where: inRange(lastWeek),
      select: { localDate: true },
      distinct: ['localDate'],
    }),
    prisma.activityEntry.findMany({ where: inRange(thisWeek), select: { localDate: true, durationMinutes: true } }),
    prisma.activityEntry.findMany({ where: inRange(lastWeek), select: { durationMinutes: true } }),
    prisma.moodEntry.findMany({
      where: inRange(thisWeek),
      select: { localDate: true, moodValue: true },
    }),
    prisma.goal.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        participants: { some: { userId: user.id, acceptanceStatus: 'ACCEPTED' } },
      },
      select: { id: true, title: true, currentValue: true, targetValue: true, goalType: true },
    }),
    prisma.dailyScore.findMany({ where: inRange(thisWeek), select: { score: true } }),
  ]);

  return {
    habitsThis,
    habitsLast,
    waterDaysThis: waterThisDays.length,
    waterDaysLast: waterLastDays.length,
    activityMinutesThis: activityThis.reduce((s, a) => s + a.durationMinutes, 0),
    activityMinutesLast: activityLast.reduce((s, a) => s + a.durationMinutes, 0),
    activeDays: new Set(activityThis.map((a) => a.localDate)),
    moods,
    goals,
    avgScore: scores.length
      ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length)
      : null,
  };
}

/** Deterministic rules engine — every number below is measured, not guessed. */
function findCandidates(d: Awaited<ReturnType<typeof gather>>): Candidate[] {
  const out: Candidate[] = [];

  const habitDelta = d.habitsThis - d.habitsLast;
  if (habitDelta > 0 && d.habitsThis > 0) {
    out.push({
      type: 'POSITIVE_TREND',
      title: 'Small win this week',
      body: `You completed ${habitDelta} more habit${habitDelta === 1 ? '' : 's'} than last week.`,
      evidence: { metric: 'habit_completion_count', thisWeek: d.habitsThis, lastWeek: d.habitsLast },
      numbers: [habitDelta, d.habitsThis, d.habitsLast],
      confidence: 'high',
    });
  }

  if (d.waterDaysThis < d.waterDaysLast && d.waterDaysLast > 0) {
    out.push({
      type: 'GENTLE_NUDGE',
      title: 'Water has been quieter',
      body: `You logged water on ${d.waterDaysThis} day${d.waterDaysThis === 1 ? '' : 's'} this week, compared with ${d.waterDaysLast} last week.`,
      evidence: { metric: 'water_logged_days', thisWeek: d.waterDaysThis, lastWeek: d.waterDaysLast },
      numbers: [d.waterDaysThis, d.waterDaysLast],
      confidence: 'high',
    });
  }

  if (d.activityMinutesThis > 0) {
    const delta = d.activityMinutesThis - d.activityMinutesLast;
    if (delta > 15) {
      out.push({
        type: 'POSITIVE_TREND',
        title: 'You have been moving more',
        body: `That is ${delta} more active minutes than last week.`,
        evidence: { metric: 'activity_minutes', thisWeek: d.activityMinutesThis, lastWeek: d.activityMinutesLast },
        numbers: [delta, d.activityMinutesThis, d.activityMinutesLast],
        confidence: 'high',
      });
    }
  }

  // A co-occurrence observation, phrased strictly as an observation.
  if (d.moods.length >= 3 && d.activeDays.size >= 2) {
    const scale = { VERY_SAD: 1, SAD: 2, LOW: 3, NEUTRAL: 4, GOOD: 5, HAPPY: 6, VERY_HAPPY: 7 };
    const onActive = d.moods.filter((m) => d.activeDays.has(m.localDate));
    const offActive = d.moods.filter((m) => !d.activeDays.has(m.localDate));
    const avg = (xs: typeof d.moods) =>
      xs.length ? xs.reduce((s, m) => s + scale[m.moodValue], 0) / xs.length : 0;

    if (onActive.length && offActive.length && avg(onActive) > avg(offActive) + 0.5) {
      out.push({
        type: 'PATTERN',
        title: 'Something you might notice',
        body: 'Your mood check-ins were generally higher on days when you logged activity.',
        evidence: { metric: 'mood_vs_activity', activeDays: onActive.length, otherDays: offActive.length },
        numbers: [],
        confidence: 'medium',
      });
    }
  }

  const nearlyDone = d.goals
    .map((g) => ({ ...g, pct: goalPercent(g) }))
    .filter((g) => g.pct >= 70 && g.pct < 100)
    .sort((a, b) => b.pct - a.pct)[0];

  if (nearlyDone) {
    out.push({
      type: 'GOAL_PROGRESS',
      title: 'Nearly there',
      body: `You are ${nearlyDone.pct}% of the way through ${nearlyDone.title}.`,
      evidence: { metric: 'goal_progress', goalId: nearlyDone.id, percent: nearlyDone.pct },
      numbers: [nearlyDone.pct],
      confidence: 'high',
    });
  }

  return out;
}

/** Asks the model to warm up the wording, keeping the deterministic sentence if anything is off. */
async function polish(candidate: Candidate): Promise<string> {
  const suggestion = await rephrase(
    SYSTEM_PROMPT,
    `Finding: ${candidate.body}\nRewrite it warmly, keeping every number exactly as written.`,
  );
  if (!suggestion) return candidate.body;

  const verdict = validateInsightCopy(suggestion);
  if (!verdict.safe) return candidate.body;
  if (!numbersAreGrounded(suggestion, candidate.numbers)) return candidate.body;

  return suggestion;
}

/** Regenerates today's insights for a user. Their own data only. */
export async function generateInsights(user: User) {
  const today = todayLocalDate(user.timezone);
  const data = await gather(user, today);
  const candidates = findCandidates(data).slice(0, 3);

  if (!candidates.length) return [];

  const bodies = await Promise.all(candidates.map(polish));

  return prisma.$transaction(async (tx) => {
    // Today's set is replaced wholesale so insights never pile up stale.
    await tx.aiInsight.deleteMany({
      where: { userId: user.id, generatedAt: { gte: new Date(Date.now() - 20 * 3600_000) } },
    });

    const created = [];
    for (const [i, candidate] of candidates.entries()) {
      created.push(
        await tx.aiInsight.create({
          data: {
            userId: user.id,
            insightType: candidate.type,
            title: candidate.title,
            body: bodies[i]!,
            evidenceJson: candidate.evidence,
            confidence: candidate.confidence,
          },
        }),
      );
    }
    return created;
  });
}

export async function listInsights(userId: string) {
  return prisma.aiInsight.findMany({
    where: { userId, dismissedAt: null },
    orderBy: { generatedAt: 'desc' },
    take: 3,
  });
}

export async function dismissInsight(userId: string, insightId: string) {
  await prisma.aiInsight.updateMany({
    where: { id: insightId, userId },
    data: { dismissedAt: new Date() },
  });
}
