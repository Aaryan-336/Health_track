import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { lastNLocalDates, todayLocalDate } from '@/lib/dates';
import { logMood } from '@/features/tracking/service';
import { moodCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async (req) => {
  const user = await requireUser();
  const days = Math.min(60, Math.max(1, Number(new URL(req.url).searchParams.get('days') ?? 14)));
  const range = lastNLocalDates(todayLocalDate(user.timezone), days);

  // A user's own mood history is theirs in full — sharing rules apply only to partners.
  const entries = await prisma.moodEntry.findMany({
    where: { userId: user.id, localDate: { gte: range[0]!, lte: range[range.length - 1]! } },
    orderBy: { loggedAt: 'desc' },
  });
  return ok({ entries });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = moodCreateSchema.parse(await jsonBody(req));
  return ok(await logMood(user, input), 201);
});
