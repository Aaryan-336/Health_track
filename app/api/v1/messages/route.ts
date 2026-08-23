import { ok, jsonBody, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { listMessages, sendMessage } from '@/features/messaging/service';
import { messageCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ messages: await listMessages(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = messageCreateSchema.parse(await jsonBody(req));
  return ok(await sendMessage(user, input), 201);
});
