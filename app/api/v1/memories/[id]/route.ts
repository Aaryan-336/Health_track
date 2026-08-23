import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { deleteMemory } from '@/features/memories/service';

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteMemory(user, id);
  return ok({ deleted: true });
});
