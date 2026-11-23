import {
  ErrorCode,
  type RegisterInput,
  registerFormSchema,
} from '@manhunt/types';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useForm } from '@/lib/use-form';
import { AppText, Banner, Button, Checkbox, spacing, TextField } from '@/ui';

export const TERMS_LABEL =
  'I have read and accept the privacy policy and the terms of use';

export interface RegisterFormProps {
  /** Receives the API body (without the password confirmation). */
  onSubmit: (values: RegisterInput) => Promise<void>;
}

/** Sign-up: username, email, password twice, and privacy policy acceptance. */
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
    // A taken username or email is shown under its own field.
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
        label="Username"
        value={form.values.username}
        onChangeText={form.setField('username')}
        error={form.errors.username}
        placeholder="What other players will see"
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
        label="Password"
        value={form.values.password}
        onChangeText={form.setField('password')}
        error={form.errors.password}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm password"
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
          label={TERMS_LABEL}
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
          Read the privacy policy and terms of use
        </AppText>
      </View>

      {form.formError ? (
        <Banner tone="danger" message={form.formError} />
      ) : null}
      <Button
        title="Create account"
        onPress={form.submit}
        loading={form.submitting}
      />
    </View>
  );
}
