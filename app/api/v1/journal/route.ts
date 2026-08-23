import { prisma } from '@/lib/db/client';
import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { createJournalEntry } from '@/features/tracking/service';
import { journalCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  const entries = await prisma.journalEntry.findMany({
    where: { userId: user.id, deletedAt: null },
    include: { moodEntry: { select: { moodValue: true, stressValue: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return ok({ entries });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = journalCreateSchema.parse(await jsonBody(req));
  return ok(await createJournalEntry(user, input), 201);
});
