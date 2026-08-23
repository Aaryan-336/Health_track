import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { addProgress } from '@/features/goals/service';
import { notify } from '@/features/notifications/service';
import { getCoupleContext } from '@/lib/permissions';
import { goalProgressSchema } from '@/lib/validation/schemas';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = goalProgressSchema.parse(await jsonBody(req));

  const outcome = await addProgress(id, user.id, input.value, input.note, user.timezone);

  // A completed shared goal is a moment for both partners.
  if (outcome.completed) {
    const goal = await prisma.goal.findUnique({ where: { id } });
    const couple = await getCoupleContext(user.id);

    if (goal?.goalType === 'SHARED' && couple?.partner) {
      await notify({
        userId: couple.partner.id,
        type: 'GOAL_COMPLETED',
        dedupeKey: `goal-complete:${id}`,
        relatedResourceType: 'goal',
        relatedResourceId: id,
        payload: {
          title: `You did it — ${goal.title} 🎉`,
          body: `${user.displayName} pushed it over the line.`,
          url: `/goals/${id}`,
          emoji: goal.emoji,
          background: 'confetti',
        },
      });
    }
  }

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { milestones: { orderBy: { thresholdPct: 'asc' } } },
  });

  return ok({ outcome, goal });
});
