/**
 * Cute full-screen backgrounds for messages and letters.
 *
 * The OS controls how the tray notification looks, so this is where the
 * personality lives — the notification deep-links into one of these.
 */

export type BackgroundKey =
  | 'sunrise'
  | 'petal'
  | 'meadow'
  | 'dusk'
  | 'ocean'
  | 'ember'
  | 'confetti';

export type BackgroundDef = {
  key: BackgroundKey;
  label: string;
  emoji: string;
  /** Layered gradient — warm, soft, never a flat saturated block. */
  gradient: string;
  /** Ink colour that stays readable on the gradient in both modes. */
  ink: string;
  motes: string;
};

export const BACKGROUNDS: Record<BackgroundKey, BackgroundDef> = {
  sunrise: {
    key: 'sunrise',
    label: 'Sunrise',
    emoji: '🌅',
    gradient:
      'radial-gradient(120% 80% at 15% 5%, #FCE9B4 0%, transparent 55%), radial-gradient(120% 90% at 90% 20%, #FBD3D9 0%, transparent 60%), linear-gradient(170deg, #FDF3DF 0%, #FBE0E6 55%, #F6D9E9 100%)',
    ink: '#4A3520',
    motes: '#F5C542',
  },
  petal: {
    key: 'petal',
    label: 'Petal',
    emoji: '🌸',
    gradient:
      'radial-gradient(110% 80% at 80% 10%, #FBD6E4 0%, transparent 60%), radial-gradient(100% 90% at 10% 80%, #E6DEFA 0%, transparent 60%), linear-gradient(160deg, #FDEEF4 0%, #F4E4F5 60%, #E8E1FB 100%)',
    ink: '#5C2039',
    motes: '#F49AC1',
  },
  meadow: {
    key: 'meadow',
    label: 'Meadow',
    emoji: '🌿',
    gradient:
      'radial-gradient(110% 80% at 20% 10%, #E2F0D4 0%, transparent 60%), radial-gradient(110% 90% at 85% 75%, #FCEBBB 0%, transparent 60%), linear-gradient(165deg, #EFF6E6 0%, #E4F0DA 55%, #F6EFD8 100%)',
    ink: '#2C441F',
    motes: '#96BD7A',
  },
  dusk: {
    key: 'dusk',
    label: 'Dusk',
    emoji: '🌙',
    gradient:
      'radial-gradient(110% 80% at 75% 12%, #C9C0EE 0%, transparent 58%), radial-gradient(110% 90% at 12% 78%, #F3C9D9 0%, transparent 60%), linear-gradient(170deg, #DED8F5 0%, #D3C9EE 55%, #EBD4E2 100%)',
    ink: '#342C60',
    motes: '#ADA4EB',
  },
  ocean: {
    key: 'ocean',
    label: 'Ocean',
    emoji: '🐚',
    gradient:
      'radial-gradient(110% 80% at 18% 8%, #D3E7F8 0%, transparent 60%), radial-gradient(110% 90% at 88% 80%, #DCF0EA 0%, transparent 60%), linear-gradient(170deg, #E6F2FB 0%, #D8EAF7 55%, #E2F2EE 100%)',
    ink: '#1C3A58',
    motes: '#8FBEE8',
  },
  ember: {
    key: 'ember',
    label: 'Ember',
    emoji: '🔥',
    gradient:
      'radial-gradient(110% 80% at 22% 10%, #FBD9C6 0%, transparent 60%), radial-gradient(110% 90% at 85% 78%, #FCE4B8 0%, transparent 60%), linear-gradient(168deg, #FCEADD 0%, #F8DCC7 55%, #FAE9CE 100%)',
    ink: '#5C301E',
    motes: '#E29B7A',
  },
  confetti: {
    key: 'confetti',
    label: 'Confetti',
    emoji: '🎉',
    gradient:
      'radial-gradient(100% 70% at 10% 10%, #FCE9B4 0%, transparent 55%), radial-gradient(100% 70% at 90% 15%, #FBD6E4 0%, transparent 55%), radial-gradient(100% 70% at 50% 95%, #DFDBFA 0%, transparent 60%), linear-gradient(160deg, #FDF4E4 0%, #FAE7EE 60%, #E9E3FB 100%)',
    ink: '#4A2A3A',
    motes: '#F5C542',
  },
};

export const BACKGROUND_LIST = Object.values(BACKGROUNDS);

export const resolveBackground = (key: string | null | undefined): BackgroundDef =>
  BACKGROUNDS[(key ?? 'sunrise') as BackgroundKey] ?? BACKGROUNDS.sunrise;
