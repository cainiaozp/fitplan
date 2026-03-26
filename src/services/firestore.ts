import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile, DailyPlan, Meal, WeightRecord } from '../models';

// User Profile
export const saveUserProfile = async (uid: string, profile: UserProfile) => {
  await setDoc(doc(db, 'users', uid), {
    ...profile,
    createdAt: Timestamp.now(),
  }, { merge: true });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() as UserProfile : null;
};

export const subscribeUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) =>
  onSnapshot(doc(db, 'users', uid), (snap) => {
    callback(snap.exists() ? snap.data() as UserProfile : null);
  });

// DailyPlan
export const saveDailyPlan = async (uid: string, plan: DailyPlan) => {
  await setDoc(doc(db, 'users', uid, 'dailyPlans', plan.date), plan);
};

export const getDailyPlan = async (uid: string, date: string): Promise<DailyPlan | null> => {
  const snap = await getDoc(doc(db, 'users', uid, 'dailyPlans', date));
  return snap.exists() ? snap.data() as DailyPlan : null;
};

export const subscribeDailyPlan = (
  uid: string,
  date: string,
  callback: (plan: DailyPlan | null) => void
) =>
  onSnapshot(doc(db, 'users', uid, 'dailyPlans', date), (snap) => {
    callback(snap.exists() ? snap.data() as DailyPlan : null);
  });

// Meals
export const addMeal = async (uid: string, date: string, meal: Meal) => {
  const col = collection(db, 'users', uid, 'dailyPlans', date, 'meals');
  await setDoc(doc(col), { ...meal, createdAt: Timestamp.now() });
};

export const subscribeMeals = (
  uid: string,
  date: string,
  callback: (meals: Meal[]) => void
) => {
  const col = collection(db, 'users', uid, 'dailyPlans', date, 'meals');
  return onSnapshot(col, (snap) => {
    callback(snap.docs.map((d) => d.data() as Meal));
  });
};

// Weight Records
export const saveWeightRecord = async (uid: string, record: WeightRecord) => {
  await setDoc(
    doc(db, 'users', uid, 'weightRecords', record.date),
    { ...record, createdAt: Timestamp.now() }
  );
};

export const getWeightRecords = async (
  uid: string,
  days = 30
): Promise<WeightRecord[]> => {
  const snap = await getDocs(collection(db, 'users', uid, 'weightRecords'));
  return snap.docs.map((d) => d.data() as WeightRecord).slice(-days);
};
