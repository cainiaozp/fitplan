import { create } from 'zustand';

interface SyncState {
  isOnline: boolean;
  pendingSync: any[];
  setOnline: (status: boolean) => void;
  addPendingSync: (item: any) => void;
  clearPendingSync: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  pendingSync: [],
  setOnline: (status) => set({ isOnline: status }),
  addPendingSync: (item) =>
    set((state) => ({ pendingSync: [...state.pendingSync, item] })),
  clearPendingSync: () => set({ pendingSync: [] }),
}));
