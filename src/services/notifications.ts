import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import type { NotificationSettings } from '../models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermission = async () => {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const scheduleMealReminder = async (
  mealType: string,
  time: string,
  enabled: boolean
) => {
  if (!enabled) return;
  const [hour, minute] = time.split(':').map(Number);
  const mealNames: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
  };
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `该吃${mealNames[mealType] || mealType}了`,
      body: '打开 App 记录今日饮食',
    },
    trigger: { hour, minute, type: Notifications.SchedulableTriggerInputTypes.DAILY },
  });
};

export const scheduleExerciseReminder = async (time: string, enabled: boolean) => {
  if (!enabled) return;
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '该运动了 💪',
      body: '打开 App 查看今日运动计划',
    },
    trigger: { hour, minute, type: Notifications.SchedulableTriggerInputTypes.DAILY },
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
