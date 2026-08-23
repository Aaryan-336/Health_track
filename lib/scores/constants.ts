import type { MoodType } from '@prisma/client';

/** Ordinal weight of each mood, 1 (lowest) … 7 (highest). */
export const MOOD_SCALE: Record<MoodType, number> = {
  VERY_SAD: 1,
  SAD: 2,
  LOW: 3,
  NEUTRAL: 4,
  GOOD: 5,
  HAPPY: 6,
  VERY_HAPPY: 7,
};

export const MOOD_META: Record<
  MoodType,
  { label: string; emoji: string; colour: string }
> = {
  VERY_SAD: { label: 'Very low', emoji: '😞', colour: 'sky' },
  SAD: { label: 'Sad', emoji: '🙁', colour: 'sky' },
  LOW: { label: 'Low', emoji: '😔', colour: 'lilac' },
  NEUTRAL: { label: 'Okay', emoji: '😌', colour: 'clay' },
  GOOD: { label: 'Good', emoji: '🙂', colour: 'sage' },
  HAPPY: { label: 'Happy', emoji: '😊', colour: 'honey' },
  VERY_HAPPY: { label: 'Glowing', emoji: '🥰', colour: 'blush' },
};

export const MOOD_ORDER: MoodType[] = [
  'VERY_SAD',
  'SAD',
  'LOW',
  'NEUTRAL',
  'GOOD',
  'HAPPY',
  'VERY_HAPPY',
];

export const STRESS_LABELS = ['Calm', 'Settled', 'Busy', 'Tense', 'Overwhelmed'];
