import type { Gender, ActivityLevel } from '../models';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

// Mifflin-St Jeor 公式
export const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  gender: Gender
): number => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
};

export const calculateTDEE = (bmr: number, activityLevel: ActivityLevel): number => {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
};

export const calculateDailyTarget = (tdee: number, deficit = 500): number => {
  const target = tdee - deficit;
  return target < 500 ? 500 : target; // 最少500kcal保底
};

export const calculateWeightLossPerDay = (
  currentWeight: number,
  goalWeight: number,
  targetDays: number
): number => {
  return (currentWeight - goalWeight) / targetDays;
};
