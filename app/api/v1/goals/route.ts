import type { GoalCategory, GoalStatus } from '@prisma/client';

import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { createGoal, listGoalsForUser } from '@/features/goals/service';
import { goalCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async (req) => {
  const user = await requireUser();
  const params = new URL(req.url).searchParams;

  const status = params.get('status')?.split(',').filter(Boolean) as GoalStatus[] | undefined;
  const category = params.get('category')?.split(',').filter(Boolean) as GoalCategory[] | undefined;
  const goalType = params.get('type') as 'INDIVIDUAL' | 'SHARED' | null;

  const goals = await listGoalsForUser(user.id, {
    ...(status?.length ? { status } : {}),
    ...(category?.length ? { category } : {}),
    ...(goalType ? { goalType } : {}),
  });
  return ok({ goals });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = goalCreateSchema.parse(await jsonBody(req));
  return ok(await createGoal(user.id, input), 201);
});
