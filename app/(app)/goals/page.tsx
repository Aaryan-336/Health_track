import type { Metadata } from 'next';

import { GoalsScreen } from '@/features/goals/GoalsScreen';
import { requireUser } from '@/lib/permissions';
import { listGoalsForUser } from '@/features/goals/service';
import { goalPercent } from '@/features/goals/progress';

export const metadata: Metadata = { title: 'Goals' };
export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoalsForUser(user.id);

  return (
    <GoalsScreen
      goals={goals.map((g) => ({
        id: g.id,
        title: g.title,
        emoji: g.emoji,
        category: g.category,
        goalType: g.goalType,
        status: g.status,
        unit: g.unit,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        percent: goalPercent(g),
        deadline: g.deadline?.toISOString() ?? null,
        participants: g.participants.map((p) => ({
          id: p.user.id,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
        })),
      }))}
    />
  );
}
