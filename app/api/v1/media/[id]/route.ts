import { route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { resolveMediaForUser } from '@/features/memories/service';

/**
 * Memory photos are couple-private, so they are served through this authorised
 * route rather than from a public URL anyone could guess.
 */
export const GET = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const object = await resolveMediaForUser(user.id, id);

  return new Response(new Uint8Array(object.body), {
    headers: {
      'Content-Type': object.contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Length': String(object.body.byteLength),
    },
  });
});
