import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { createQueryClient } from '@/lib/query-client';
import { useColorSchemeName } from '@/ui';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const scheme = useColorSchemeName();

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/** Rutas protegidas: sin sesión solo existe (auth); con sesión, solo (app). */
function RootNavigator() {
  const { state } = useSession();

  useEffect(() => {
    if (state.status !== 'loading') void SplashScreen.hideAsync();
  }, [state.status]);

  if (state.status === 'loading') return null; // se sigue viendo el splash

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={state.status === 'signedIn'} redirectTo="/login">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={state.status === 'signedOut'} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
