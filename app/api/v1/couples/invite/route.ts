import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { createInvite } from '@/features/couple/service';

export const POST = route(async () => {
  const user = await requireUser();
  const invite = await createInvite(user);
  return ok({ code: invite.code, expiresAt: invite.expiresAt }, 201);
});
