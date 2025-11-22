import { create } from "zustand";

export interface ToastItem {
    id: string;
    message: string;
    createdAt: number;
}

interface ToastStore {
    toasts: ToastItem[];
    addToast: (message: string) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (message) =>
        set((state) => {
            const id = Math.random().toString(36).slice(2) + Date.now();
            const toast: ToastItem = {
                id,
                message,
                createdAt: Date.now(),
            };
            // 최대 10개까지만 유지
            const toasts = [...state.toasts, toast].slice(-10);
            return { toasts };
        }),
    removeToast: (id) =>
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        })),
    clearToasts: () => set({ toasts: [] }),
})); 