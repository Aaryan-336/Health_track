import { z } from 'zod';

const uuid = z.string().uuid('That reference is not valid.');
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date.');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a HH:mm time.');

export const idParam = z.object({ id: uuid });

// ─── Auth & profile ─────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: z.string().email('That email does not look right.').max(200),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
  displayName: z.string().trim().min(1, 'Tell us your name.').max(60),
  timezone: z.string().min(1).max(60).default('UTC'),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  timezone: z.string().min(1).max(60).optional(),
  themePreference: z.enum(['HONEY', 'BLUSH', 'LILAC', 'SAGE', 'SKY', 'CLAY']).optional(),
  modePreference: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
});

export const healthProfileSchema = z.object({
  dailyWaterGoalMl: z.number().int().min(250).max(8000).optional(),
  dailyMealGoal: z.number().int().min(1).max(10).optional(),
  weeklyWorkoutGoal: z.number().int().min(0).max(21).optional(),
  dailyActivityGoal: z.number().int().min(5).max(600).optional(),
  glassSizeMl: z.number().int().min(50).max(1000).optional(),
});

export const privacyUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        category: z.enum([
          'HEALTH_SCORE',
          'WATER_TARGET',
          'WATER_DETAIL',
          'MEALS',
          'WORKOUTS',
          'HABITS',
          'MOOD_STATUS',
          'MOOD_NOTE',
          'STREAKS',
        ]),
        shareEnabled: z.boolean(),
        detailLevel: z.enum(['NONE', 'STATUS', 'SUMMARY', 'DETAIL']),
      }),
    )
    .min(1)
    .max(20),
});

// ─── Couple ─────────────────────────────────────────────────────────────────

export const coupleCreateSchema = z.object({
  title: z.string().trim().max(80).optional(),
  anniversary: z.string().datetime().optional(),
});

export const coupleUpdateSchema = z.object({
  title: z.string().trim().max(80).nullable().optional(),
  anniversary: z.string().datetime().nullable().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ENDED']).optional(),
});

export const coupleJoinSchema = z.object({
  code: z.string().trim().min(4).max(20).toUpperCase(),
});

// ─── Tracking ───────────────────────────────────────────────────────────────

export const waterCreateSchema = z.object({
  amountMl: z.number().int().min(10).max(3000),
  loggedAt: z.string().datetime().optional(),
});

export const mealCreateSchema = z.object({
  mealType: z.enum(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'OTHER']),
  description: z.string().trim().min(1, 'What did you have?').max(300),
  feelsGood: z.boolean().default(true),
  loggedAt: z.string().datetime().optional(),
});

export const workoutCreateSchema = z.object({
  activityType: z.string().trim().min(1).max(60),
  durationMinutes: z.number().int().min(1).max(1000),
  intensity: z.number().int().min(1).max(3).default(2),
  note: z.string().trim().max(300).optional(),
  loggedAt: z.string().datetime().optional(),
});

export const moodCreateSchema = z.object({
  moodValue: z.enum(['VERY_SAD', 'SAD', 'LOW', 'NEUTRAL', 'GOOD', 'HAPPY', 'VERY_HAPPY']),
  stressValue: z.number().int().min(1).max(5).default(3),
  note: z.string().trim().max(500).optional(),
  shareMode: z.enum(['PRIVATE', 'STATUS_ONLY', 'STATUS_AND_NOTE']).default('PRIVATE'),
  loggedAt: z.string().datetime().optional(),
});

export const journalCreateSchema = z.object({
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().min(1, 'Write a little something.').max(20000),
  prompt: z.string().trim().max(200).optional(),
  moodEntryId: uuid.optional(),
  isShared: z.boolean().default(false),
});

export const journalUpdateSchema = journalCreateSchema.partial();

export const habitCreateSchema = z.object({
  title: z.string().trim().min(1, 'Name your habit.').max(80),
  icon: z.string().trim().max(40).default('sparkle'),
  colour: z.enum(['honey', 'blush', 'lilac', 'sage', 'sky', 'clay']).default('lilac'),
  frequencyRule: z
    .string()
    .regex(/^(DAILY|WEEKLY:(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*)$/)
    .default('DAILY'),
  targetPerDay: z.number().int().min(1).max(20).default(1),
});

export const habitUpdateSchema = habitCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export const habitCompleteSchema = z.object({
  localDate: localDate.optional(),
  undo: z.boolean().default(false),
});

// ─── Goals ──────────────────────────────────────────────────────────────────

export const goalCreateSchema = z
  .object({
    title: z.string().trim().min(1, 'Give your goal a name.').max(100),
    description: z.string().trim().max(600).optional(),
    category: z.enum([
      'WATER',
      'NUTRITION',
      'FITNESS',
      'ACTIVITY',
      'HABIT',
      'WELLNESS',
      'RELATIONSHIP',
      'DATE_ADVENTURE',
      'QUALITY_TIME',
      'CUSTOM',
    ]),
    emoji: z.string().trim().max(8).default('✨'),
    goalType: z.enum(['INDIVIDUAL', 'SHARED']),
    targetValue: z.number().min(1, 'Target must be at least 1.').max(1_000_000),
    unit: z.string().trim().min(1).max(24).default('times'),
    deadline: z.string().datetime().nullable().optional(),
    recurrenceRule: z.string().trim().max(60).nullable().optional(),
    progressMode: z.enum(['MANUAL', 'AUTO_TRACKED', 'CHECK_IN']).default('MANUAL'),
    milestones: z.array(z.number().int().min(1).max(99)).max(5).optional(),
  })
  .strict();

export const goalUpdateSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(600).nullable().optional(),
  emoji: z.string().trim().max(8).optional(),
  targetValue: z.number().min(1).max(1_000_000).optional(),
  unit: z.string().trim().min(1).max(24).optional(),
  deadline: z.string().datetime().nullable().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED', 'EXPIRED']).optional(),
});

export const goalProgressSchema = z.object({
  value: z.number().min(-100000).max(100000).refine((v) => v !== 0, 'Add a real amount.'),
  note: z.string().trim().max(200).optional(),
});

export const goalParticipantSchema = z.object({
  acceptanceStatus: z.enum(['ACCEPTED', 'DECLINED']),
});

// ─── Challenges, check-ins, promises ────────────────────────────────────────

export const challengeCreateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(600).optional(),
  emoji: z.string().trim().max(8).default('🔥'),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  targetRule: z.enum(['DAILY_CHECK_IN', 'HABIT_COMPLETIONS', 'ACTIVITY_SESSIONS', 'CUSTOM']),
  targetValue: z.number().int().min(1).max(365),
});

export const challengeProgressSchema = z.object({
  increment: z.number().int().min(1).max(50).default(1),
});

export const checkInSchema = z.object({
  note: z.string().trim().max(300).optional(),
  status: z.enum(['DONE', 'SKIPPED']).default('DONE'),
});

export const promiseCreateSchema = z.object({
  title: z.string().trim().min(1).max(100),
  promiseText: z.string().trim().min(1).max(1000),
  emoji: z.string().trim().max(8).default('🤍'),
  trackingRule: z.string().trim().max(120).optional(),
});

export const promiseActionSchema = z.object({
  action: z.enum(['ACCEPT', 'COMPLETE', 'ARCHIVE']),
});

// ─── Messages, letters, memories ────────────────────────────────────────────

export const messageCreateSchema = z.object({
  body: z.string().trim().min(1, 'Say something sweet.').max(2000),
  messageType: z
    .enum(['NOTE', 'ENCOURAGEMENT', 'THINKING_OF_YOU', 'CELEBRATION', 'REMINDER'])
    .default('NOTE'),
  background: z.string().trim().max(30).default('sunrise'),
  scheduledFor: z.string().datetime().nullable().optional(),
});

export const reactionSchema = z.object({
  reaction: z.string().trim().min(1).max(8),
});

export const letterCreateSchema = z.object({
  triggerLabel: z.string().trim().min(1, 'When should this be opened?').max(80),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(5000),
  background: z.string().trim().max(30).default('dusk'),
});

export const memoryCreateSchema = z.object({
  caption: z.string().trim().max(400).optional(),
  memoryDate: z.string().datetime(),
});

// ─── Notifications ──────────────────────────────────────────────────────────

export const subscribeSchema = z.object({
  endpoint: z.string().url().max(600),
  keys: z.object({ p256dh: z.string().min(1).max(300), auth: z.string().min(1).max(300) }),
  deviceMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const unsubscribeSchema = z.object({ endpoint: z.string().url().max(600) });

export const notificationPrefsSchema = z.object({
  updates: z
    .array(
      z.object({
        category: z.enum([
          'HEALTH_REMINDERS',
          'COUPLE_MESSAGES',
          'GOAL_REMINDERS',
          'HABIT_REMINDERS',
          'CELEBRATIONS',
          'DAILY_CHECK_IN',
        ]),
        enabled: z.boolean(),
        quietStart: hhmm.nullable().optional(),
        quietEnd: hhmm.nullable().optional(),
      }),
    )
    .min(1)
    .max(12),
});

export const reminderCreateSchema = z.object({
  notificationType: z.enum([
    'HEALTH_REMINDER',
    'WATER_REMINDER',
    'MEAL_REMINDER',
    'WORKOUT_REMINDER',
    'HABIT_REMINDER',
    'GOAL_REMINDER',
    'DAILY_CHECK_IN',
  ]),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(200),
  time: hhmm,
  relatedResourceId: uuid.nullable().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type GoalCreateInput = z.infer<typeof goalCreateSchema>;
