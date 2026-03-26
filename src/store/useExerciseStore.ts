import { create } from 'zustand';
import type { Exercise, DailyPlan } from '../models';

interface ExerciseState {
  exercises: Exercise[];
  todayPlan: DailyPlan | null;
  setExercises: (exercises: Exercise[]) => void;
  setTodayPlan: (plan: DailyPlan) => void;
  completeExercises: () => void;
  getTotalCaloriesBurned: () => number;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  todayPlan: null,
  setExercises: (exercises) => set({ exercises }),
  setTodayPlan: (plan) => set({ todayPlan: plan }),
  completeExercises: () =>
    set((state) => ({
      todayPlan: state.todayPlan
        ? { ...state.todayPlan, completed: { ...state.todayPlan.completed, exercises: true } }
        : null,
    })),
  getTotalCaloriesBurned: () =>
    get().exercises.reduce((sum, e) => sum + e.caloriesBurned, 0),
}));
