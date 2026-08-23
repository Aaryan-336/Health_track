import type { ShareCategory, ShareDetailLevel } from '@prisma/client';

import { prisma } from '@/lib/db/client';

/**
 * Consent model.
 *
 * Health and mood data is private by default. A partner sees a category only
 * when the owner has explicitly enabled it, and only at the detail level the
 * owner chose. Nothing here is ever inferred from being in a couple.
 */

export const SHARE_CATEGORIES: ShareCategory[] = [
  'HEALTH_SCORE',
  'WATER_TARGET',
  'WATER_DETAIL',
  'MEALS',
  'WORKOUTS',
  'HABITS',
  'MOOD_STATUS',
  'MOOD_NOTE',
  'STREAKS',
];

export const SHARE_CATEGORY_COPY: Record<
  ShareCategory,
  { label: string; description: string; levels: ShareDetailLevel[] }
> = {
  HEALTH_SCORE: {
    label: 'Daily health score',
    description: 'Let your partner see how your day is going.',
    levels: ['NONE', 'STATUS', 'SUMMARY'],
  },
  WATER_TARGET: {
    label: 'Water goal reached',
    description: 'Only whether you hit your water goal — never the amount.',
    levels: ['NONE', 'STATUS'],
  },
  WATER_DETAIL: {
    label: 'Exact water amount',
    description: 'Share the precise number of glasses you drank.',
    levels: ['NONE', 'DETAIL'],
  },
  MEALS: {
    label: 'Meals',
    description: 'How many meals you logged today.',
    levels: ['NONE', 'STATUS', 'SUMMARY'],
  },
  WORKOUTS: {
    label: 'Movement',
    description: 'That you moved today, and optionally what you did.',
    levels: ['NONE', 'STATUS', 'SUMMARY'],
  },
  HABITS: {
    label: 'Habits',
    description: 'How many of your habits you completed.',
    levels: ['NONE', 'STATUS', 'SUMMARY'],
  },
  MOOD_STATUS: {
    label: 'Mood',
    description: 'Share how you are feeling, without the details.',
    levels: ['NONE', 'STATUS'],
  },
  MOOD_NOTE: {
    label: 'Mood notes',
    description: 'Also share the note you wrote with a check-in.',
    levels: ['NONE', 'DETAIL'],
  },
  STREAKS: {
    label: 'Streaks',
    description: 'Let your partner cheer on your streaks.',
    levels: ['NONE', 'STATUS', 'SUMMARY'],
  },
};

export type SharingMap = Record<ShareCategory, ShareDetailLevel>;

const NONE_MAP = (): SharingMap =>
  Object.fromEntries(SHARE_CATEGORIES.map((c) => [c, 'NONE'])) as SharingMap;

/** Effective consent for a user. Absent rows mean "not shared". */
export async function getSharingMap(userId: string): Promise<SharingMap> {
  const rows = await prisma.sharingPreference.findMany({ where: { userId } });
  const map = NONE_MAP();
  for (const row of rows) {
    map[row.category] = row.shareEnabled ? row.detailLevel : 'NONE';
  }
  return map;
}

export function shares(map: SharingMap, category: ShareCategory): boolean {
  return map[category] !== 'NONE';
}

export function detailOf(map: SharingMap, category: ShareCategory): ShareDetailLevel {
  return map[category];
}

/** Seeds every category as off — the private-by-default starting point. */
export async function ensureSharingDefaults(userId: string) {
  await prisma.sharingPreference.createMany({
    data: SHARE_CATEGORIES.map((category) => ({
      userId,
      category,
      shareEnabled: false,
      detailLevel: 'NONE' as ShareDetailLevel,
    })),
    skipDuplicates: true,
  });
}
