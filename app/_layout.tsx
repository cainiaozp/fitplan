import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useUserStore } from '../src/store/useUserStore';
import { getLocalUserId } from '../src/services/auth';
import { getUserProfile } from '../src/services/firestore';

export default function RootLayout() {
  const { setUserId, setProfile } = useUserStore();

  useEffect(() => {
    const loadProfile = async () => {
      const userId = await getLocalUserId();
      if (userId) {
        setUserId(userId);
        const profile = await getUserProfile(userId);
        if (profile) {
          setProfile(profile);
        }
      }
    };
    loadProfile();
  }, [setUserId, setProfile]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
