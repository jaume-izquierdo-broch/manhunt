import { Link } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { AppText, Screen, spacing } from '@/ui';
import { authApi } from './auth.api';
import { LoginForm } from './components/login-form';
import { RegisterForm } from './components/register-form';
import { useSession } from './session.store';

export type AuthMode = 'login' | 'register';

const COPY = {
  login: {
    subtitle: 'Log in to play',
    switchText: "Don't have an account? Sign up",
    switchHref: '/register',
  },
  register: {
    subtitle: 'Create your account',
    switchText: 'Already have an account? Log in',
    switchHref: '/login',
  },
} as const;

/** Login and sign-up share the header with the logo; each has its own form. */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const signIn = useSession((s) => s.signIn);

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          accessible={false}
        />
        <AppText variant="title" center>
          Manhunt
        </AppText>
        <AppText tone="muted" center>
          {COPY[mode].subtitle}
        </AppText>
      </View>

      {mode === 'login' ? (
        <LoginForm
          onSubmit={async (values) => signIn(await authApi.login(values))}
        />
      ) : (
        <RegisterForm
          onSubmit={async (values) => signIn(await authApi.register(values))}
        />
      )}

      <Link href={COPY[mode].switchHref} replace style={styles.link}>
        <AppText variant="label" tone="primary">
          {COPY[mode].switchText}
        </AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  logo: { width: 112, height: 112 },
  link: { alignSelf: 'center', padding: spacing.sm },
});
