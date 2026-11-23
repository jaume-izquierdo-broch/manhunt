import { z } from 'zod';

/** Versión vigente de la política de privacidad y condiciones (se guarda al registrarse). */
export const TERMS_VERSION = '2026-11';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Mínimo 3 caracteres')
  .max(30, 'Máximo 30 caracteres')
  // Sin "@": así "usuario o email" en el login nunca es ambiguo.
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y _');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email demasiado largo')
  .pipe(z.email('Email no válido'));

export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres');

/** Lo que recibe la API en POST /auth/register. */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, {
    error: 'Debes aceptar la política de privacidad y las condiciones',
  }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Formulario de registro de la app: añade la confirmación de contraseña. */
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
    // Se comprueba aunque otros campos tengan errores (por defecto zod lo saltaría).
    when: ({ value }) => {
      const v = value as { password?: unknown; confirmPassword?: unknown };
      return (
        typeof v.password === 'string' && typeof v.confirmPassword === 'string'
      );
    },
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;

/** Login con nombre de usuario o email. */
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Escribe tu usuario o email'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface UserDto {
  id: string;
  username: string;
  /** null solo en cuentas antiguas creadas antes de pedir email. */
  email: string | null;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}
