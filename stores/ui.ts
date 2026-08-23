'use client';

import { create } from 'zustand';

/** Ephemeral UI state. Nothing here is a source of truth — the server is. */

export type Toast = {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
  emoji?: string;
};

type UIState = {
  toasts: Toast[];
  toast: (message: string, tone?: Toast['tone'], emoji?: string) => void;
  dismissToast: (id: string) => void;

  addSheetOpen: boolean;
  setAddSheet: (open: boolean) => void;
};

export const useUI = create<UIState>((set) => ({
  toasts: [],
  toast: (message, tone = 'success', emoji) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, tone, emoji }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  addSheetOpen: false,
  setAddSheet: (addSheetOpen) => set({ addSheetOpen }),
}));
