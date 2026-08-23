import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { localDateFor, shiftLocalDate, todayLocalDate } from '../lib/dates';
import { recalcHealthScore } from '../lib/scores/health';
import { recalcCoupleScore } from '../lib/scores/couple';

/**
 * Development seed — two connected partners with a few weeks of gentle history,
 * so every screen has something real to render.
 */

const prisma = new PrismaClient();
const TZ = 'Europe/London';

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const at = (dayOffset: number, hour: number, minute = 0) => {
  const d = daysAgo(dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
};
const pick = <T>(xs: readonly T[], i: number): T => xs[i % xs.length]!;

async function main() {
  console.log('🌱 Seeding…');

  await prisma.user.deleteMany({ where: { email: { in: ['maya@bloom.test', 'sam@bloom.test'] } } });

  const passwordHash = await bcrypt.hash('bloom1234', 12);
  const today = todayLocalDate(TZ);

  const maya = await prisma.user.create({
    data: {
      email: 'maya@bloom.test',
      passwordHash,
      displayName: 'Maya Chen',
      timezone: TZ,
      themePreference: 'BLUSH',
      modePreference: 'SYSTEM',
      onboardedAt: daysAgo(30),
      healthProfile: {
        create: { dailyWaterGoalMl: 2000, glassSizeMl: 250, dailyMealGoal: 3, dailyActivityGoal: 30 },
      },
    },
  });

  const sam = await prisma.user.create({
    data: {
      email: 'sam@bloom.test',
      passwordHash,
      displayName: 'Sam Okonkwo',
      timezone: TZ,
      themePreference: 'SAGE',
      modePreference: 'SYSTEM',
      onboardedAt: daysAgo(30),
      healthProfile: {
        create: { dailyWaterGoalMl: 2500, glassSizeMl: 250, dailyMealGoal: 3, dailyActivityGoal: 45 },
      },
    },
  });

  const couple = await prisma.coupleRelationship.create({
    data: {
      userAId: maya.id,
      userBId: sam.id,
      status: 'ACTIVE',
      title: 'Maya & Sam',
      anniversary: new Date('2021-06-12T00:00:00Z'),
      activatedAt: daysAgo(30),
    },
  });

  // ── Privacy: Maya shares a little, Sam shares more. Both start from "off". ──
  await prisma.sharingPreference.createMany({
    data: [
      { userId: maya.id, category: 'HEALTH_SCORE', shareEnabled: true, detailLevel: 'STATUS' },
      { userId: maya.id, category: 'WATER_TARGET', shareEnabled: true, detailLevel: 'STATUS' },
      { userId: maya.id, category: 'MOOD_STATUS', shareEnabled: true, detailLevel: 'STATUS' },
      { userId: maya.id, category: 'STREAKS', shareEnabled: true, detailLevel: 'SUMMARY' },
      { userId: maya.id, category: 'WATER_DETAIL', shareEnabled: false, detailLevel: 'NONE' },
      { userId: maya.id, category: 'MOOD_NOTE', shareEnabled: false, detailLevel: 'NONE' },
      { userId: maya.id, category: 'MEALS', shareEnabled: false, detailLevel: 'NONE' },
      { userId: maya.id, category: 'WORKOUTS', shareEnabled: true, detailLevel: 'STATUS' },
      { userId: maya.id, category: 'HABITS', shareEnabled: false, detailLevel: 'NONE' },

      { userId: sam.id, category: 'HEALTH_SCORE', shareEnabled: true, detailLevel: 'SUMMARY' },
      { userId: sam.id, category: 'WATER_TARGET', shareEnabled: true, detailLevel: 'STATUS' },
      { userId: sam.id, category: 'WATER_DETAIL', shareEnabled: true, detailLevel: 'DETAIL' },
      { userId: sam.id, category: 'WORKOUTS', shareEnabled: true, detailLevel: 'SUMMARY' },
      { userId: sam.id, category: 'HABITS', shareEnabled: true, detailLevel: 'SUMMARY' },
      { userId: sam.id, category: 'MOOD_STATUS', shareEnabled: true, detailLevel: 'STATUS' },
      { userId: sam.id, category: 'MOOD_NOTE', shareEnabled: true, detailLevel: 'DETAIL' },
      { userId: sam.id, category: 'STREAKS', shareEnabled: true, detailLevel: 'SUMMARY' },
      { userId: sam.id, category: 'MEALS', shareEnabled: false, detailLevel: 'NONE' },
    ],
  });

  const categories = [
    'HEALTH_REMINDERS',
    'COUPLE_MESSAGES',
    'GOAL_REMINDERS',
    'HABIT_REMINDERS',
    'CELEBRATIONS',
    'DAILY_CHECK_IN',
  ] as const;

  await prisma.notificationPreference.createMany({
    data: [maya.id, sam.id].flatMap((userId) =>
      categories.map((category) => ({
        userId,
        category,
        enabled: true,
        quietStart: '22:30',
        quietEnd: '07:00',
      })),
    ),
  });

  // ── Habits ────────────────────────────────────────────────────────────────
  const habitSpecs = [
    { userId: maya.id, title: 'Morning stretch', colour: 'lilac', icon: 'sparkle' },
    { userId: maya.id, title: 'Read 10 pages', colour: 'honey', icon: 'book' },
    { userId: maya.id, title: 'Take vitamins', colour: 'sage', icon: 'leaf' },
    { userId: sam.id, title: 'Walk at lunch', colour: 'sky', icon: 'walk' },
    { userId: sam.id, title: 'No screens after 10', colour: 'clay', icon: 'moon' },
  ];

  const habits = [];
  for (const spec of habitSpecs) {
    habits.push(
      await prisma.habit.create({
        data: {
          ownerId: spec.userId,
          title: spec.title,
          colour: spec.colour,
          icon: spec.icon,
          frequencyRule: 'DAILY',
          createdAt: daysAgo(30),
        },
      }),
    );
  }

  // ── 21 days of gentle, imperfect history ─────────────────────────────────
  const waterRows = [];
  const mealRows = [];
  const activityRows = [];
  const moodRows = [];
  const habitRows = [];
  const checkInRows = [];

  const moods = ['GOOD', 'HAPPY', 'NEUTRAL', 'VERY_HAPPY', 'LOW', 'GOOD', 'HAPPY'] as const;
  const meals = [
    ['BREAKFAST', 'Porridge with berries'],
    ['LUNCH', 'Halloumi salad'],
    ['DINNER', 'Roast veg and rice'],
    ['SNACK', 'Apple and peanut butter'],
  ] as const;
  const activities = [
    ['Walk', 35, 1],
    ['Yoga', 40, 2],
    ['Run', 28, 3],
    ['Cycling', 50, 2],
    ['Swim', 45, 2],
  ] as const;

  for (let d = 20; d >= 0; d -= 1) {
    const localDate = localDateFor(daysAgo(d), TZ);

    for (const user of [maya, sam]) {
      // Not every day is a full day — missing data is normal, not failure.
      const restDay = (d + (user.id === maya.id ? 0 : 3)) % 7 === 0;
      if (restDay && d !== 0) continue;

      const glasses = 4 + ((d + (user.id === maya.id ? 1 : 4)) % 5);
      for (let g = 0; g < glasses; g += 1) {
        waterRows.push({
          userId: user.id,
          amountMl: 250,
          loggedAt: at(d, 8 + g * 2),
          localDate,
        });
      }

      const mealCount = 2 + (d % 2);
      for (let m = 0; m < mealCount; m += 1) {
        const [mealType, description] = pick(meals, d + m);
        mealRows.push({
          userId: user.id,
          mealType,
          description,
          feelsGood: true,
          loggedAt: at(d, 8 + m * 5),
          localDate,
        });
      }

      if ((d + (user.id === maya.id ? 0 : 1)) % 3 !== 0) {
        const [activityType, durationMinutes, intensity] = pick(activities, d);
        activityRows.push({
          userId: user.id,
          activityType,
          durationMinutes,
          intensity,
          loggedAt: at(d, 18),
          localDate,
        });
      }

      moodRows.push({
        userId: user.id,
        moodValue: pick([...moods], d + (user.id === maya.id ? 0 : 2)),
        stressValue: 1 + ((d + 1) % 4),
        note:
          d % 5 === 0
            ? user.id === maya.id
              ? 'Busy day but a good one.'
              : 'Slept well, felt steady all day.'
            : null,
        // Maya keeps her notes to herself; Sam shares his.
        shareMode: user.id === maya.id ? 'STATUS_ONLY' : 'STATUS_AND_NOTE',
        loggedAt: at(d, 21),
        localDate,
      } as const);

      for (const habit of habits.filter((h) => h.ownerId === user.id)) {
        if ((d + habit.title.length) % 4 === 0) continue;
        habitRows.push({ habitId: habit.id, userId: user.id, localDate, completedAt: at(d, 9) });
      }

      if (d % 6 !== 0) {
        checkInRows.push({
          userId: user.id,
          coupleId: couple.id,
          localDate,
          status: 'DONE' as const,
          note: d % 7 === 0 ? 'Thinking of you today 💛' : null,
          createdAt: at(d, 20),
        });
      }
    }
  }

  await prisma.waterEntry.createMany({ data: waterRows });
  await prisma.mealEntry.createMany({ data: mealRows });
  await prisma.activityEntry.createMany({ data: activityRows });
  await prisma.moodEntry.createMany({ data: moodRows });
  await prisma.habitCompletion.createMany({ data: habitRows });
  await prisma.dailyCheckIn.createMany({ data: checkInRows, skipDuplicates: true });

  // ── Journal ───────────────────────────────────────────────────────────────
  await prisma.journalEntry.createMany({
    data: [
      {
        userId: maya.id,
        title: 'A quiet win',
        content:
          'Managed the whole morning routine without rushing. The stretch first thing really does change the shape of the day.',
        prompt: 'What made you smile today?',
        isShared: false,
        localDate: shiftLocalDate(today, -2),
        createdAt: daysAgo(2),
      },
      {
        userId: maya.id,
        title: 'Sunday slowness',
        content: 'We walked the long way home. No plans, no phones. More of that please.',
        prompt: 'What are you grateful for today?',
        isShared: true,
        localDate: shiftLocalDate(today, -5),
        createdAt: daysAgo(5),
      },
      {
        userId: sam.id,
        title: 'Steady',
        content: 'Third run this week. Legs heavy but the head feels clear.',
        isShared: false,
        localDate: shiftLocalDate(today, -1),
        createdAt: daysAgo(1),
      },
    ],
  });

  // ── Goals ─────────────────────────────────────────────────────────────────
  const makeGoal = async (data: {
    creatorId: string;
    title: string;
    description?: string;
    category: 'WATER' | 'FITNESS' | 'HABIT' | 'RELATIONSHIP' | 'DATE_ADVENTURE' | 'QUALITY_TIME' | 'WELLNESS' | 'CUSTOM';
    emoji: string;
    goalType: 'INDIVIDUAL' | 'SHARED';
    targetValue: number;
    currentValue: number;
    unit: string;
    progressMode?: 'MANUAL' | 'AUTO_TRACKED' | 'CHECK_IN';
    participants: string[];
  }) => {
    const goal = await prisma.goal.create({
      data: {
        ownerType: data.goalType === 'SHARED' ? 'COUPLE' : 'PERSONAL',
        goalType: data.goalType,
        coupleId: data.goalType === 'SHARED' ? couple.id : null,
        creatorId: data.creatorId,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        emoji: data.emoji,
        targetValue: data.targetValue,
        currentValue: data.currentValue,
        unit: data.unit,
        progressMode: data.progressMode ?? 'MANUAL',
        status: 'ACTIVE',
        createdAt: daysAgo(18),
        milestones: {
          create: [
            { thresholdPct: 25, label: 'Off to a lovely start' },
            { thresholdPct: 50, label: 'Halfway there' },
            { thresholdPct: 75, label: 'Nearly there' },
          ],
        },
        participants: {
          create: data.participants.map((userId, i) => ({
            userId,
            role: i === 0 ? 'OWNER' : 'PARTNER',
            acceptanceStatus: 'ACCEPTED',
            respondedAt: daysAgo(18),
          })),
        },
      },
    });

    // Milestones already passed at seed time are marked reached.
    const pct = (data.currentValue / data.targetValue) * 100;
    await prisma.goalMilestone.updateMany({
      where: { goalId: goal.id, thresholdPct: { lte: pct } },
      data: { reachedAt: daysAgo(4) },
    });

    return goal;
  };

  await makeGoal({
    creatorId: maya.id,
    title: 'Move every other day',
    description: 'Anything counts — a walk, a swim, a dance in the kitchen.',
    category: 'FITNESS',
    emoji: '🏃',
    goalType: 'INDIVIDUAL',
    targetValue: 12,
    currentValue: 8,
    unit: 'sessions',
    progressMode: 'AUTO_TRACKED',
    participants: [maya.id],
  });

  await makeGoal({
    creatorId: maya.id,
    title: 'Drink more water',
    category: 'WATER',
    emoji: '💧',
    goalType: 'INDIVIDUAL',
    targetValue: 150,
    currentValue: 94,
    unit: 'glasses',
    progressMode: 'AUTO_TRACKED',
    participants: [maya.id],
  });

  const dateGoal = await makeGoal({
    creatorId: sam.id,
    title: 'Twelve dates this year',
    description: 'One properly planned evening a month. Phones away.',
    category: 'DATE_ADVENTURE',
    emoji: '🎡',
    goalType: 'SHARED',
    targetValue: 12,
    currentValue: 7,
    unit: 'dates',
    participants: [sam.id, maya.id],
  });

  await makeGoal({
    creatorId: maya.id,
    title: 'Sunday walks, together',
    description: 'Rain or shine. Especially rain.',
    category: 'QUALITY_TIME',
    emoji: '🌳',
    goalType: 'SHARED',
    targetValue: 20,
    currentValue: 14,
    unit: 'walks',
    participants: [maya.id, sam.id],
  });

  await makeGoal({
    creatorId: sam.id,
    title: 'Cook something new',
    description: 'A recipe neither of us has tried.',
    category: 'RELATIONSHIP',
    emoji: '🍲',
    goalType: 'SHARED',
    targetValue: 10,
    currentValue: 3,
    unit: 'meals',
    participants: [sam.id, maya.id],
  });

  await prisma.goalContribution.createMany({
    data: [
      { goalId: dateGoal.id, userId: sam.id, value: 1, note: 'Picnic in the park', localDate: shiftLocalDate(today, -12), contributedAt: daysAgo(12) },
      { goalId: dateGoal.id, userId: maya.id, value: 1, note: 'That tiny cinema', localDate: shiftLocalDate(today, -6), contributedAt: daysAgo(6) },
    ],
  });

  // ── Challenge ─────────────────────────────────────────────────────────────
  await prisma.challenge.create({
    data: {
      coupleId: couple.id,
      title: 'Seven days of checking in',
      description: 'A whole week of saying hello properly.',
      emoji: '🔥',
      startAt: daysAgo(5),
      endAt: new Date(Date.now() + 2 * 86_400_000),
      targetRule: 'DAILY_CHECK_IN',
      targetValue: 7,
      progressA: 5,
      progressB: 4,
      status: 'ACTIVE',
    },
  });

  // ── Promises ──────────────────────────────────────────────────────────────
  await prisma.promise.createMany({
    data: [
      {
        coupleId: couple.id,
        creatorId: maya.id,
        title: 'No phones at dinner',
        promiseText: 'We eat together, properly, with the screens face down in another room.',
        emoji: '🍽️',
        status: 'ACTIVE',
        acceptedByUserAAt: daysAgo(14),
        acceptedByUserBAt: daysAgo(14),
        createdAt: daysAgo(14),
      },
      {
        coupleId: couple.id,
        creatorId: sam.id,
        title: 'Say the hard thing kindly',
        promiseText: 'When something is bothering us, we say it the same week — gently, but we say it.',
        emoji: '🤍',
        status: 'PROPOSED',
        acceptedByUserBAt: daysAgo(2),
        createdAt: daysAgo(2),
      },
    ],
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      {
        coupleId: couple.id,
        senderId: sam.id,
        recipientId: maya.id,
        body: 'Saw the first blossom on the walk this morning and thought of you. Hope today is kind.',
        messageType: 'THINKING_OF_YOU',
        background: 'petal',
        deliveredAt: daysAgo(1),
        openedAt: daysAgo(1),
        createdAt: daysAgo(1),
      },
      {
        coupleId: couple.id,
        senderId: maya.id,
        recipientId: sam.id,
        body: 'Third run this week — I noticed. Proud of you.',
        messageType: 'ENCOURAGEMENT',
        background: 'meadow',
        deliveredAt: daysAgo(2),
        createdAt: daysAgo(2),
      },
      {
        coupleId: couple.id,
        senderId: sam.id,
        recipientId: maya.id,
        body: 'Dinner is handled tonight. Just come home.',
        messageType: 'NOTE',
        background: 'ember',
        deliveredAt: new Date(Date.now() - 3_600_000),
        createdAt: new Date(Date.now() - 3_600_000),
      },
    ],
  });

  const firstMessage = await prisma.message.findFirst({
    where: { coupleId: couple.id, senderId: sam.id },
    orderBy: { createdAt: 'asc' },
  });
  if (firstMessage) {
    await prisma.messageReaction.create({
      data: { messageId: firstMessage.id, userId: maya.id, reaction: '🥰' },
    });
  }

  // ── Open When letters ─────────────────────────────────────────────────────
  await prisma.openWhenLetter.createMany({
    data: [
      {
        coupleId: couple.id,
        senderId: sam.id,
        recipientId: maya.id,
        triggerLabel: 'you have had a long day',
        title: 'Put this down and breathe',
        body:
          'You have done enough today. Truly. Take your shoes off, drink a glass of water, and let the rest wait until tomorrow. I am proud of you on the ordinary days too.',
        background: 'dusk',
        status: 'SEALED',
        createdAt: daysAgo(10),
      },
      {
        coupleId: couple.id,
        senderId: sam.id,
        recipientId: maya.id,
        triggerLabel: 'you cannot sleep',
        title: 'A quiet one for 3am',
        body:
          'Nothing is as heavy at 3am as it looks. Put your hand on your chest, count four in and six out, and remember that I am right here.',
        background: 'ocean',
        status: 'SEALED',
        createdAt: daysAgo(10),
      },
      {
        coupleId: couple.id,
        senderId: maya.id,
        recipientId: sam.id,
        triggerLabel: 'you need a push',
        title: 'Go on then',
        body:
          'You always feel better after. Shoes on, door open, ten minutes. That is all I am asking. You have never once regretted going.',
        background: 'sunrise',
        status: 'OPENED',
        openedAt: daysAgo(3),
        createdAt: daysAgo(9),
      },
    ],
  });

  // ── Memories ──────────────────────────────────────────────────────────────
  await prisma.memory.createMany({
    data: [
      { coupleId: couple.id, creatorId: maya.id, caption: 'The long way home', memoryDate: daysAgo(5) },
      { coupleId: couple.id, creatorId: sam.id, caption: 'Burnt the first pancake, ate it anyway', memoryDate: daysAgo(12) },
      { coupleId: couple.id, creatorId: maya.id, caption: 'That tiny cinema with the broken seat', memoryDate: daysAgo(20) },
    ],
  });

  // ── Derived data: rebuild scores from the logs above, exactly as the app does ──
  for (const user of [maya, sam]) {
    for (let d = 20; d >= 0; d -= 1) {
      const localDate = localDateFor(daysAgo(d), TZ);
      await prisma.$transaction((tx) => recalcHealthScore(tx, user.id, localDate, TZ));
    }
  }
  for (let d = 20; d >= 0; d -= 1) {
    const localDate = localDateFor(daysAgo(d), TZ);
    await prisma.$transaction((tx) => recalcCoupleScore(tx, couple.id, localDate, TZ));
  }

  console.log(`✓ Seeded ${waterRows.length} water, ${mealRows.length} meals, ${activityRows.length} activities`);
  console.log('✓ Rebuilt 21 days of derived health and couple scores');
  console.log('✓ maya@bloom.test / sam@bloom.test — password: bloom1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
