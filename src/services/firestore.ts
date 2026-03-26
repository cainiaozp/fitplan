import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, DailyPlan, Meal, WeightRecord } from '../models';

const key = (uid: string, ...parts: string[]) =>
  \`@fitplan:\${uid}:\${parts.join(':')}\`;

const jsonGet = async <T>(k: string): Promise<T | null> => {
  const v = await AsyncStorage.getItem(k);
  return v ? (JSON.parse(v) as T) : null;
};
const jsonSet = async <T>(k: string, v: T) =>
  AsyncStorage.setItem(k, JSON.stringify(v));

// ─── User Profile ────────────────────────────────────────────────────────────

export const saveUserProfile = async (uid: string, profile: UserProfile): Promise<void> => {
  await jsonSet(key(uid, 'profile'), { ...profile, createdAt: new Date().toISOString() });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  return jsonGet<UserProfile>(key(uid, 'profile'));
};

export const subscribeUserProfile = (
  uid: string,
  callback: (profile: UserProfile | null) => void
): (() => void) => {
  getUserProfile(uid).then(callback);
  return () => {};
};

// ─── DailyPlan ───────────────────────────────────────────────────────────────

export const saveDailyPlan = async (uid: string, plan: DailyPlan): Promise<void> => {
  await jsonSet(key(uid, 'dailyPlan', plan.date), plan);
};

export const getDailyPlan = async (uid: string, date: string): Promise<DailyPlan | null> => {
  return jsonGet<DailyPlan>(key(uid, 'dailyPlan', date));
};

export const subscribeDailyPlan = (
  uid: string,
  date: string,
  callback: (plan: DailyPlan | null) => void
): (() => void) => {
  getDailyPlan(uid, date).then(callback);
  return () => {};
};

// ─── Meals ───────────────────────────────────────────────────────────────────

export const addMeal = async (uid: string, date: string, meal: Meal): Promise<void> => {
  const meals = await getMeals(uid, date);
  await jsonSet(key(uid, 'meals', date), [...meals, { ...meal, createdAt: new Date().toISOString() }]);
};

export const getMeals = async (uid: string, date: string): Promise<Meal[]> => {
  return jsonGet<Meal[]>(key(uid, 'meals', date)) ?? [];
};

export const subscribeMeals = (
  uid: string,
  date: string,
  callback: (meals: Meal[]) => void
): (() => void) => {
  getMeals(uid, date).then(callback);
  return () => {};
};

// ─── Weight Records ───────────────────────────────────────────────────────────

export const saveWeightRecord = async (uid: string, record: WeightRecord): Promise<void> => {
  const records = await getWeightRecords(uid);
  const existing = records.findIndex((r) => r.date === record.date);
  const updated =
    existing >= 0
      ? records.map((r, i) => (i === existing ? { ...record, createdAt: new Date().toISOString() } : r))
      : [...records, { ...record, createdAt: new Date().toISOString() }];
  await jsonSet(key(uid, 'weightRecords'), updated);
};

export const getWeightRecords = async (uid: string, days = 30): Promise<WeightRecord[]> => {
  const all = await jsonGet<WeightRecord[]>(key(uid, 'weightRecords')) ?? [];
  return all.slice(-days);
};
