import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Manhunt' }} />
      <Stack.Screen name="create" options={{ title: 'Crear partida' }} />
      <Stack.Screen name="join" options={{ title: 'Unirse a una partida' }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Partida' }} />
    </Stack>
  );
}
