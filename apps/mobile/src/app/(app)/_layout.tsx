import { Stack } from 'expo-router';
import { useRealtimeConnection } from '@/features/realtime/use-realtime-connection';

export default function AppLayout() {
  useRealtimeConnection();

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Manhunt' }} />
      <Stack.Screen name="create" options={{ title: 'Create match' }} />
      <Stack.Screen name="join" options={{ title: 'Join a match' }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Match' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
