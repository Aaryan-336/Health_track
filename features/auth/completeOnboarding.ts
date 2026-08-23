'use server';

import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db/client';
import { requireUser } from '@/lib/permissions';

/** Marks onboarding done. Everything it sets was already validated by the API. */
export async function completeOnboarding() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardedAt: new Date() },
  });
  redirect('/home');
}
