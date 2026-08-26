"use client";

import { create } from "zustand";

type DialogState = {
  dialog: { kind: "confirm" | "notice"; message: string; resolve?: (accepted: boolean) => void } | null;
  showConfirm: (message: string) => Promise<boolean>;
  showNotice: (message: string) => void;
  closeDialog: (accepted: boolean) => void;
};

export const useDialogStore = create<DialogState>((set, get) => ({
  dialog: null,
  showConfirm: (message) => new Promise((resolve) => set({ dialog: { kind: "confirm", message, resolve } })),
  showNotice: (message) => set({ dialog: { kind: "notice", message } }),
  closeDialog: (accepted) => {
    get().dialog?.resolve?.(accepted);
    set({ dialog: null });
  },
}));

export const confirmDialog = (message: string) => useDialogStore.getState().showConfirm(message);
export const noticeDialog = (message: string) => useDialogStore.getState().showNotice(message);
