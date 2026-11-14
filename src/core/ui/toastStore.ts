// A tiny global store for one-line success/info confirmations — the RN equivalent of a
// snackbar/toast. Use this for actions that don't otherwise navigate away or visibly change
// what's on screen (e.g. Duplicate Day appends a new day tab off to the side of a horizontal
// scroller, easy to miss), so the user gets some signal the action actually did something.
import { create } from "zustand";

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));
