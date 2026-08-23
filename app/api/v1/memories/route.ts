import { ok, route } from '@/lib/api/respond';
import { requireUser } from '@/lib/permissions';
import { BadRequest } from '@/lib/permissions/errors';
import { createMemory, listMemories } from '@/features/memories/service';
import { memoryCreateSchema } from '@/lib/validation/schemas';

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ memories: await listMemories(user.id) });
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const form = await req.formData();

  const input = memoryCreateSchema.parse({
    caption: (form.get('caption') as string) || undefined,
    memoryDate: form.get('memoryDate'),
  });

  const files = form.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0);

  try {
    return ok(await createMemory(user, input, files), 201);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Please choose')) {
      throw BadRequest(error.message);
    }
    if (error instanceof Error && error.message.includes('larger than')) {
      throw BadRequest(error.message);
    }
    throw error;
  }
});
