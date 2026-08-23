import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { GoalDetail } from '@/features/goals/GoalDetail';
import { requireUser } from '@/lib/permissions';
import { AppError } from '@/lib/permissions/errors';
import { getGoalForUser } from '@/features/goals/service';
import { goalPercent } from '@/features/goals/progress';
import { prisma } from '@/lib/db/client';

export const metadata: Metadata = { title: 'Goal' };
export const dynamic = 'force-dynamic';

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  let goal;
  try {
    goal = await getGoalForUser(id, user.id);
  } catch (error) {
    // A goal that is not yours is indistinguishable from one that does not exist.
    if (error instanceof AppError) notFound();
    throw error;
  }

  const contributions = await prisma.goalContribution.findMany({
    where: { goalId: id },
    include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    orderBy: { contributedAt: 'desc' },
    take: 20,
  });

  const canContribute = goal.participants.some(
    (p) => p.userId === user.id && p.acceptanceStatus === 'ACCEPTED',
  );

  return (
    <GoalDetail
      viewerId={user.id}
      canContribute={canContribute}
      isCreator={goal.creatorId === user.id}
      goal={{
        id: goal.id,
        title: goal.title,
        description: goal.description,
        emoji: goal.emoji,
        category: goal.category,
        goalType: goal.goalType,
        status: goal.status,
        unit: goal.unit,
        currentValue: goal.currentValue,
        targetValue: goal.targetValue,
        percent: goalPercent(goal),
        progressMode: goal.progressMode,
        deadline: goal.deadline?.toISOString() ?? null,
        completedAt: goal.completedAt?.toISOString() ?? null,
        milestones: goal.milestones.map((m) => ({
          id: m.id,
          label: m.label,
          thresholdPct: m.thresholdPct,
          reached: Boolean(m.reachedAt),
        })),
        participants: goal.participants.map((p) => ({
          id: p.user.id,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
          role: p.role,
          acceptanceStatus: p.acceptanceStatus,
        })),
      }}
      contributions={contributions.map((c) => ({
        id: c.id,
        value: c.value,
        note: c.note,
        sourceType: c.sourceType,
        contributedAt: c.contributedAt.toISOString(),
        user: c.user,
      }))}
    />
  );
}
