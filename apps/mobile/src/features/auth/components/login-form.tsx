import { type LoginInput, loginSchema } from '@manhunt/types';
import { View } from 'react-native';
import { useForm } from '@/lib/use-form';
import { Banner, Button, spacing, TextField } from '@/ui';

export interface LoginFormProps {
  onSubmit: (values: LoginInput) => Promise<void>;
}

/** Log in with a username or an email. */
export function LoginForm({ onSubmit }: LoginFormProps) {
  const form = useForm({
    schema: loginSchema,
    initialValues: { identifier: '', password: '' },
    onSubmit,
  });

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label="Username or email"
        value={form.values.identifier}
        onChangeText={form.setField('identifier')}
        error={form.errors.identifier}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
      />
      <TextField
        label="Password"
        value={form.values.password}
        onChangeText={form.setField('password')}
        error={form.errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={form.submit}
      />
      {form.formError ? (
        <Banner tone="danger" message={form.formError} />
      ) : null}
      <Button title="Log in" onPress={form.submit} loading={form.submitting} />
    </View>
  );
}
