import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { todayLocalDate } from '@/lib/dates';
import { createHabit, listHabitsWithToday } from '@/features/tracking/service';
import { habitCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async (req) => {
  const user = await requireUser();
  const date = new URL(req.url).searchParams.get('date') ?? todayLocalDate(user.timezone);
  return ok({ habits: await listHabitsWithToday(user.id, date), localDate: date });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = habitCreateSchema.parse(await jsonBody(req));
  return ok(await createHabit(user, input), 201);
});
