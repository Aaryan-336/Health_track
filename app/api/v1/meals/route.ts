import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';
import { logMeal } from '@/features/tracking/service';
import { mealCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async (req) => {
  const user = await requireUser();
  const date = new URL(req.url).searchParams.get('date') ?? todayLocalDate(user.timezone);
  const entries = await prisma.mealEntry.findMany({
    where: { userId: user.id, localDate: date },
    orderBy: { loggedAt: 'asc' },
  });
  return ok({ entries, localDate: date });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = mealCreateSchema.parse(await jsonBody(req));
  return ok(await logMeal(user, input), 201);
});
