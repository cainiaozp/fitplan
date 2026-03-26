import { create } from 'zustand';
import type { UserProfile } from '../models';

interface UserState {
  userId: string | null;
  profile: UserProfile | null;
  setUserId: (userId: string) => void;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  profile: null,
  setUserId: (userId) => set({ userId }),
  setProfile: (profile) => set({ profile }),
  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),
  clearProfile: () => set({ userId: null, profile: null }),
}));
