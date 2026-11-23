import {
  ErrorCode,
  type RegisterInput,
  registerFormSchema,
} from '@manhunt/types';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useForm } from '@/lib/use-form';
import { AppText, Banner, Button, Checkbox, spacing, TextField } from '@/ui';

export interface RegisterFormProps {
  /** Recibe lo que espera la API (sin la confirmación de contraseña). */
  onSubmit: (values: RegisterInput) => Promise<void>;
}

/** Registro: usuario, email, contraseña (dos veces) y aceptación de la privacidad. */
export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const router = useRouter();
  const form = useForm({
    schema: registerFormSchema,
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    onSubmit: ({ confirmPassword: _confirm, ...input }) => onSubmit(input),
    // Usuario o email repetidos se muestran en su campo, no como error general.
    fieldErrorsFromServer: (error) =>
      error.code === ErrorCode.USERNAME_TAKEN
        ? { username: error.message }
        : error.code === ErrorCode.EMAIL_TAKEN
          ? { email: error.message }
          : null,
  });

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label="Usuario"
        value={form.values.username}
        onChangeText={form.setField('username')}
        error={form.errors.username}
        placeholder="Así te verán en las partidas"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
      />
      <TextField
        label="Email"
        value={form.values.email}
        onChangeText={form.setField('email')}
        error={form.errors.email}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
      />
      <TextField
        label="Contraseña"
        value={form.values.password}
        onChangeText={form.setField('password')}
        error={form.errors.password}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Repite la contraseña"
        value={form.values.confirmPassword}
        onChangeText={form.setField('confirmPassword')}
        error={form.errors.confirmPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <View style={{ gap: spacing.sm }}>
        <Checkbox
          label="He leído y acepto la política de privacidad y las condiciones de uso"
          checked={form.values.acceptTerms}
          onChange={form.setField('acceptTerms')}
          error={form.errors.acceptTerms}
        />
        <AppText
          variant="label"
          tone="primary"
          accessibilityRole="link"
          onPress={() => router.push('/privacy')}
        >
          Leer la política de privacidad y las condiciones
        </AppText>
      </View>

      {form.formError ? (
        <Banner tone="danger" message={form.formError} />
      ) : null}
      <Button
        title="Crear cuenta"
        onPress={form.submit}
        loading={form.submitting}
      />
    </View>
  );
}
