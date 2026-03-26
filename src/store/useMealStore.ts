import { create } from 'zustand';
import type { Meal } from '../models';

interface MealState {
  meals: Meal[];
  todayCalories: number;
  setMeals: (meals: Meal[]) => void;
  addMeal: (meal: Meal) => void;
  removeMeal: (mealId: string) => void;
  updateCalories: () => void;
}

export const useMealStore = create<MealState>((set) => ({
  meals: [],
  todayCalories: 0,
  setMeals: (meals) => set({ meals }),
  addMeal: (meal) =>
    set((state) => ({
      meals: [...state.meals, meal],
    })),
  removeMeal: (mealId) =>
    set((state) => ({
      meals: state.meals.filter((m) => m.id !== mealId),
    })),
  updateCalories: () =>
    set((state) => ({
      todayCalories: state.meals.reduce((sum, m) => sum + m.totalCalories, 0),
    })),
}));
