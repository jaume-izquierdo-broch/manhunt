import { type LoginInput, loginSchema, registerSchema } from '@manhunt/types';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '@/lib/http/api-error';
import { type FieldErrors, validateForm } from '@/lib/forms';
import { Banner, Button, spacing, TextField } from '@/ui';

export type AuthMode = 'login' | 'register';

export interface AuthFormProps {
  mode: AuthMode;
  /** Recibe los datos ya validados. Si lanza, se muestra el mensaje del error. */
  onSubmit: (values: LoginInput) => Promise<void>;
}

const copy = {
  login: { submit: 'Entrar', passwordHint: undefined },
  register: { submit: 'Crear cuenta', passwordHint: 'Mínimo 8 caracteres' },
} as const;

/** Formulario de login/registro. Valida con los mismos esquemas que el servidor. */
export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  const [values, setValues] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof LoginInput) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async () => {
    const result = validateForm(
      mode === 'login' ? loginSchema : registerSchema,
      values,
    );
    setErrors(result.errors);
    if (!result.ok) return;

    setServerError(null);
    setSubmitting(true);
    try {
      await onSubmit(result.data);
    } catch (error) {
      setServerError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label="Usuario"
        value={values.username}
        onChangeText={update('username')}
        error={errors.username}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
      />
      <TextField
        label="Contraseña"
        value={values.password}
        onChangeText={update('password')}
        error={errors.password}
        placeholder={copy[mode].passwordHint}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        textContentType={mode === 'login' ? 'password' : 'newPassword'}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {serverError ? <Banner tone="danger" message={serverError} /> : null}
      <Button title={copy[mode].submit} onPress={submit} loading={submitting} />
    </View>
  );
}
