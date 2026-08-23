import type { GoalCategory } from '@prisma/client';

/**
 * Category presentation. Kept apart from the service so client components can
 * import it without pulling server-only code into the browser bundle.
 */
export const GOAL_CATEGORY_META: Record<
  GoalCategory,
  { label: string; emoji: string; colour: string; group: 'health' | 'relationship' }
> = {
  WATER: { label: 'Water', emoji: '💧', colour: 'sky', group: 'health' },
  NUTRITION: { label: 'Nutrition', emoji: '🥗', colour: 'sage', group: 'health' },
  FITNESS: { label: 'Fitness', emoji: '🏃', colour: 'clay', group: 'health' },
  ACTIVITY: { label: 'Activity', emoji: '🚶', colour: 'honey', group: 'health' },
  HABIT: { label: 'Habits', emoji: '🌱', colour: 'lilac', group: 'health' },
  WELLNESS: { label: 'Wellness', emoji: '🧘', colour: 'lilac', group: 'health' },
  RELATIONSHIP: { label: 'Relationship', emoji: '💞', colour: 'blush', group: 'relationship' },
  DATE_ADVENTURE: { label: 'Dates & adventures', emoji: '🎡', colour: 'honey', group: 'relationship' },
  QUALITY_TIME: { label: 'Quality time', emoji: '🕰️', colour: 'clay', group: 'relationship' },
  CUSTOM: { label: 'Something else', emoji: '✨', colour: 'sage', group: 'health' },
};

export const HEALTH_CATEGORIES = (
  Object.keys(GOAL_CATEGORY_META) as GoalCategory[]
).filter((c) => GOAL_CATEGORY_META[c].group === 'health');

export const RELATIONSHIP_CATEGORIES = (
  Object.keys(GOAL_CATEGORY_META) as GoalCategory[]
).filter((c) => GOAL_CATEGORY_META[c].group === 'relationship');
