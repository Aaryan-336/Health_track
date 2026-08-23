import { prisma } from '@/lib/db/client';
import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { lastNLocalDates, todayLocalDate } from '@/lib/dates';
import { computeHealthScore } from '@/lib/scores/health';

export const GET = route(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const localDate = url.searchParams.get('date') ?? todayLocalDate(user.timezone);
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days') ?? 7)));

  // Today is computed live so it always reflects the very latest log.
  const today = await computeHealthScore(prisma, user.id, localDate, user.timezone);

  const range = lastNLocalDates(localDate, days);
  const history = await prisma.dailyScore.findMany({
    where: { userId: user.id, localDate: { gte: range[0]!, lte: range[range.length - 1]! } },
    orderBy: { localDate: 'asc' },
    select: { localDate: true, score: true },
  });

  const byDate = new Map(history.map((h) => [h.localDate, h.score]));
  if (today.score !== null) byDate.set(localDate, today.score);

  return ok({
    today,
    history: range.map((d) => ({ localDate: d, score: byDate.get(d) ?? null })),
  });
});
