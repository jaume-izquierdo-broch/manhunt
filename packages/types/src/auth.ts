import { z } from 'zod';

/**
 * Current version of the privacy policy and terms of use. The API stores the
 * version each user accepted, so bump it whenever the text changes materially.
 */
export const TERMS_VERSION = '2026-11';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'At least 3 characters')
  .max(30, 'At most 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and _');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email('Invalid email'));

export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128, 'At most 128 characters');

/** Body of `POST /auth/register`. */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, {
    error: 'You must accept the privacy policy and terms of use',
  }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** The app's sign-up form: the API body plus a password confirmation. */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
    // Run this check even when other fields are invalid (zod skips it by default).
    when: ({ value }) => {
      const v = value as { password?: unknown; confirmPassword?: unknown };
      return (
        typeof v.password === 'string' && typeof v.confirmPassword === 'string'
      );
    },
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;

/** Body of `POST /auth/login`. `identifier` is a username or an email. */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username or email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface UserDto {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}
