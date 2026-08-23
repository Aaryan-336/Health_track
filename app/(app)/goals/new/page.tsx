import type { Metadata } from 'next';

import { GoalComposer } from '@/features/goals/GoalComposer';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'New goal' };
export const dynamic = 'force-dynamic';

export default async function NewGoalPage() {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  const connected = ctx?.couple.status === 'ACTIVE' && Boolean(ctx.partner);

  return <GoalComposer connected={connected} partnerName={ctx?.partner?.displayName ?? null} />;
}
