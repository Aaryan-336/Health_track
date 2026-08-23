import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { respondToInvitation } from '@/features/goals/service';
import { goalParticipantSchema } from '@/lib/validation/schemas';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = goalParticipantSchema.parse(await jsonBody(req));
  return ok(await respondToInvitation(id, user.id, input.acceptanceStatus));
});
