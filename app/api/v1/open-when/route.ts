import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { createLetter, listLetters } from '@/features/messaging/service';
import { letterCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ letters: await listLetters(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = letterCreateSchema.parse(await jsonBody(req));
  return ok(await createLetter(user, input), 201);
});
