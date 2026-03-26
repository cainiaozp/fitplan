import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@fitplan_user_id';

/** Generate a random local user ID */
export const generateLocalUserId = (): string => {
  return 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

/** Get the stored local user ID */
export const getLocalUserId = async (): Promise<string | null> => {
  return AsyncStorage.getItem(USER_ID_KEY);
};

/** Set the local user ID (call after registration/setup) */
export const setLocalUserId = async (userId: string): Promise<void> => {
  await AsyncStorage.setItem(USER_ID_KEY, userId);
};

/** Clear the local user ID (logout / reset) */
export const clearLocalUserId = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_ID_KEY);
};

/**
 * Simple auth state that mirrors Firebase onAuthChange pattern.
 * Passes the local userId as the "user" — null if no profile is stored.
 */
export const onAuthChange = async (
  callback: (userId: string | null) => void
): Promise<() => void> => {
  // Read once immediately
  const userId = await getLocalUserId();
  callback(userId);

  // No real-time listener needed for local storage — callback fires once.
  // Return a no-op unsubscribe for API compatibility.
  return () => {};
};
