import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { offerLocation } from '@/features/location/location-access.store';
import { useRealtimeConnection } from '@/features/realtime/use-realtime-connection';

export default function AppLayout() {
  useRealtimeConnection();

  useEffect(() => {
    void offerLocation();
  }, []);

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Manhunt' }} />
      <Stack.Screen name="join" options={{ title: 'Join a match' }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
