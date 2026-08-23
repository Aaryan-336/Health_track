'use client';

import { create } from 'zustand';

export type CelebrationPayload = {
  title: string;
  body: string;
  emoji: string;
  kind?: string;
};

type CelebrationState = {
  active: CelebrationPayload | null;
  celebrate: (payload: CelebrationPayload) => void;
  clear: () => void;
};

/** Drives the full-screen animated completion moment. */
export const useCelebration = create<CelebrationState>((set) => ({
  active: null,
  celebrate: (active) => set({ active }),
  clear: () => set({ active: null }),
}));
