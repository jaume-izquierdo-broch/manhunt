import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useSession } from '@/features/auth/session.store';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/ui';

void SplashScreen.preventAutoHideAsync();

/** Headers and screen backgrounds in the app's colors. */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Protected routes: signed out, only (auth) exists; signed in, only (app). */
function RootNavigator() {
  const status = useSession((s) => s.status);

  useEffect(() => {
    void useSession.getState().restore();
  }, []);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  // Keep showing the splash screen while the stored session loads.
  if (status === 'loading') return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedIn'} redirectTo="/login">
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Always reachable: linked from sign-up, so it must be readable without an account. */}
      <Stack.Screen
        name="privacy"
        options={{
          headerShown: true,
          title: 'Privacy and terms',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
