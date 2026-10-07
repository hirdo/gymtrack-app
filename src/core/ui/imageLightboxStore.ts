// RN equivalent of gymtrack-web's ImageLightboxService — a tiny global store so any screen can
// open a full-screen zoomed view of an exercise thumbnail without threading open/close state
// through props. Mounted once as <ImageLightbox /> in the root layout.
import { create } from "zustand";

interface ImageLightboxState {
  activeImage: { url: string; alt: string } | null;
  open: (url: string | null | undefined, alt?: string) => void;
  close: () => void;
}

export const useImageLightboxStore = create<ImageLightboxState>((set) => ({
  activeImage: null,
  open: (url, alt = "") => {
    if (!url) return;
    set({ activeImage: { url, alt } });
  },
  close: () => set({ activeImage: null }),
}));
