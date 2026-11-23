import { Link } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { AppText, Screen, spacing } from '@/ui';
import { authApi } from '../auth.api';
import { LoginForm } from '../components/login-form';
import { RegisterForm } from '../components/register-form';
import { useSession } from '../session-provider';

export type AuthMode = 'login' | 'register';

const copy = {
  login: {
    subtitle: 'Inicia sesión para jugar',
    switchText: '¿No tienes cuenta? Regístrate',
    switchHref: '/register',
  },
  register: {
    subtitle: 'Crea tu cuenta',
    switchText: '¿Ya tienes cuenta? Inicia sesión',
    switchHref: '/login',
  },
} as const;

/** Login y registro comparten la cabecera con el logo; cada uno tiene su formulario. */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { signIn } = useSession();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          accessibilityIgnoresInvertColors
          accessible={false}
        />
        <AppText variant="title" center>
          Manhunt
        </AppText>
        <AppText tone="muted" center>
          {copy[mode].subtitle}
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

      <Link href={copy[mode].switchHref} replace style={styles.link}>
        <AppText variant="label" tone="primary">
          {copy[mode].switchText}
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
