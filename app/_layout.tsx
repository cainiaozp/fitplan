import { Stack } from 'expo-router';
import { onAuthChange } from '../src/services/auth';
import { useEffect } from 'react';
import { useUserStore } from '../src/store/useUserStore';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const { setProfile } = useUserStore();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        const { getUserProfile } = await import('../src/services/firestore');
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setProfile(profile);
        }
      }
    });
    return unsubscribe;
  }, [setProfile]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
