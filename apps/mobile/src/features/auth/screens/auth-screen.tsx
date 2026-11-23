import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppText, Screen, spacing } from '@/ui';
import { authApi } from '../auth.api';
import { AuthForm, type AuthMode } from '../components/auth-form';
import { useSession } from '../session-provider';

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

/** Login y registro comparten pantalla; solo cambia el texto y el endpoint. */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { signIn } = useSession();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AppText variant="title" center>
          Manhunt
        </AppText>
        <AppText tone="muted" center>
          {copy[mode].subtitle}
        </AppText>
      </View>

      <AuthForm
        mode={mode}
        onSubmit={async (values) => {
          await signIn(
            mode === 'login'
              ? await authApi.login(values)
              : await authApi.register(values),
          );
        }}
      />

      <Link href={copy[mode].switchHref} replace style={styles.link}>
        <AppText variant="label" tone="primary">
          {copy[mode].switchText}
        </AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.xxl, marginBottom: spacing.lg },
  link: { alignSelf: 'center', padding: spacing.sm },
});
