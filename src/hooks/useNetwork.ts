import { useEffect } from 'react';
import * as Network from 'expo-network';
import { useSyncStore } from '../store/useSyncStore';

export const useNetwork = () => {
  const { setOnline } = useSyncStore();

  useEffect(() => {
    const check = async () => {
      const state = await Network.getNetworkStateAsync();
      setOnline(state.isConnected ?? false);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return useSyncStore((s) => s.isOnline);
};
