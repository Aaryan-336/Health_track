import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { lastNLocalDates, todayLocalDate } from '@/lib/dates';
import { logWorkout } from '@/features/tracking/service';
import { workoutCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const days = Math.min(30, Math.max(1, Number(url.searchParams.get('days') ?? 7)));
  const range = lastNLocalDates(todayLocalDate(user.timezone), days);

  const entries = await prisma.activityEntry.findMany({
    where: { userId: user.id, localDate: { gte: range[0]!, lte: range[range.length - 1]! } },
    orderBy: { loggedAt: 'desc' },
  });
  return ok({ entries });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = workoutCreateSchema.parse(await jsonBody(req));
  return ok(await logWorkout(user, input), 201);
});
