import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { generateInsights, listInsights } from '@/features/insights/service';

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ insights: await listInsights(user.id) });
});

/** Regenerates insights on demand, using only this user's own data. */
export const POST = route(async () => {
  const user = await requireUser();
  await generateInsights(user);
  return ok({ insights: await listInsights(user.id) });
});
