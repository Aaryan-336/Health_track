import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { deleteJournalEntry, updateJournalEntry } from '@/features/tracking/service';
import { journalUpdateSchema } from '@/lib/validation/schemas';

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = journalUpdateSchema.parse(await jsonBody(req));
  return ok(await updateJournalEntry(user, id, input));
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteJournalEntry(user, id);
  return ok({ deleted: true });
});
