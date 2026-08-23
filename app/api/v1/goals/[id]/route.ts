import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { deleteGoal, getGoalForUser, updateGoal } from '@/features/goals/service';
import { goalUpdateSchema } from '@/lib/validation/schemas';

export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return ok(await getGoalForUser(id, user.id));
});

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = goalUpdateSchema.parse(await jsonBody(req));
  return ok(await updateGoal(id, user.id, input));
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteGoal(id, user.id);
  return ok({ deleted: true });
});
