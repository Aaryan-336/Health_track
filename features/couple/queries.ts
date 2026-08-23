import type { User } from '@prisma/client';

import { prisma } from '@/lib/db/client';
import { todayLocalDate } from '@/lib/dates';
import { getCoupleContext } from '@/lib/permissions';
import { computeCoupleScore } from '@/lib/scores/couple';
import { goalPercent } from '@/features/goals/progress';
import { buildPartnerSnapshot } from './snapshot';

/**
 * Everything the couple dashboard renders, assembled in one server-side place.
 * Partner health data arrives only via `buildPartnerSnapshot`, which applies
 * the owner's consent settings.
 */
export async function getCoupleDashboard(user: User) {
  const ctx = await getCoupleContext(user.id);
  if (!ctx) return { state: 'none' as const };

  if (ctx.couple.status !== 'ACTIVE' || !ctx.partner) {
    const invite = await prisma.coupleInvite.findFirst({
      where: { coupleId: ctx.couple.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { code: true, expiresAt: true },
    });
    return { state: 'pending' as const, inviteCode: invite?.code ?? null };
  }

  const today = todayLocalDate(user.timezone);
  const partner = ctx.partner;

  const [score, sharedGoals, checkIns, challenge, latestMessage, promises, memories, letters, snapshot] =
    await Promise.all([
      computeCoupleScore(prisma, ctx.couple.id, today, user.timezone),
      prisma.goal.findMany({
        where: { coupleId: ctx.couple.id, goalType: 'SHARED', status: 'ACTIVE', deletedAt: null },
        include: { milestones: { where: { reachedAt: null }, orderBy: { thresholdPct: 'asc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),
      prisma.dailyCheckIn.findMany({ where: { coupleId: ctx.couple.id, localDate: today } }),
      prisma.challenge.findFirst({
        where: { coupleId: ctx.couple.id, status: 'ACTIVE' },
        orderBy: { startAt: 'desc' },
      }),
      prisma.message.findFirst({
        where: { coupleId: ctx.couple.id, deletedAt: null, deliveredAt: { not: null } },
        include: { sender: { select: { displayName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.promise.count({ where: { coupleId: ctx.couple.id, status: 'ACTIVE' } }),
      prisma.memory.count({ where: { coupleId: ctx.couple.id, deletedAt: null } }),
      prisma.openWhenLetter.count({
        where: { coupleId: ctx.couple.id, recipientId: user.id, status: 'SEALED', deletedAt: null },
      }),
      buildPartnerSnapshot(partner, user.id),
    ]);

  const myCheckIn = checkIns.find((c) => c.userId === user.id);
  const partnerCheckIn = checkIns.find((c) => c.userId === partner.id);

  const daysTogether = ctx.couple.anniversary
    ? Math.floor((Date.now() - ctx.couple.anniversary.getTime()) / 86_400_000)
    : null;

  return {
    state: 'active' as const,
    couple: { id: ctx.couple.id, title: ctx.couple.title, daysTogether },
    partner: { id: partner.id, displayName: partner.displayName, avatarUrl: partner.avatarUrl },
    score: { value: score.score, components: score.components, streak: score.streak },
    checkIn: {
      mine: myCheckIn ? { status: myCheckIn.status, note: myCheckIn.note } : null,
      partnerDone: partnerCheckIn?.status === 'DONE',
      partnerNote: partnerCheckIn?.status === 'DONE' ? partnerCheckIn.note : null,
    },
    sharedGoals: sharedGoals.map((g) => ({
      id: g.id,
      title: g.title,
      emoji: g.emoji,
      unit: g.unit,
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      percent: goalPercent(g),
      nextMilestone: g.milestones[0]
        ? { label: g.milestones[0].label, thresholdPct: g.milestones[0].thresholdPct }
        : null,
    })),
    challenge: challenge
      ? {
          id: challenge.id,
          title: challenge.title,
          emoji: challenge.emoji,
          targetValue: challenge.targetValue,
          myProgress: ctx.side === 'A' ? challenge.progressA : challenge.progressB,
          partnerProgress: ctx.side === 'A' ? challenge.progressB : challenge.progressA,
          endAt: challenge.endAt.toISOString(),
        }
      : null,
    latestMessage: latestMessage
      ? {
          id: latestMessage.id,
          body: latestMessage.body,
          background: latestMessage.background,
          senderName: latestMessage.sender.displayName,
          fromMe: latestMessage.senderId === user.id,
          createdAt: latestMessage.createdAt.toISOString(),
        }
      : null,
    counts: { promises, memories, sealedLetters: letters },
    snapshot,
  };
}

export type CoupleDashboard = Awaited<ReturnType<typeof getCoupleDashboard>>;
