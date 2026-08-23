import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ChallengesScreen } from '@/features/couple/ChallengesScreen';
import { listChallenges } from '@/features/couple/challenges';
import { getCoupleContext, requireUser } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Challenges' };
export const dynamic = 'force-dynamic';

export default async function ChallengesPage() {
  const user = await requireUser();
  const ctx = await getCoupleContext(user.id);
  if (!ctx || ctx.couple.status !== 'ACTIVE' || !ctx.partner) redirect('/us');

  const challenges = await listChallenges(user.id);

  return (
    <ChallengesScreen
      partnerName={ctx.partner.displayName}
      challenges={challenges.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        emoji: c.emoji,
        status: c.status,
        targetRule: c.targetRule,
        targetValue: c.targetValue,
        startAt: c.startAt.toISOString(),
        endAt: c.endAt.toISOString(),
        myProgress: c.myProgress,
        partnerProgress: c.partnerProgress,
      }))}
    />
  );
}
