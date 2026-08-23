import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { removeWaterEntry } from '@/features/tracking/service';

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  return ok(await removeWaterEntry(user, id));
});
