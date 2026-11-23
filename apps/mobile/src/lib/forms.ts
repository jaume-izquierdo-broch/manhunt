import type { z } from 'zod';

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

export type ValidationResult<T> =
  | { ok: true; data: T; errors: FieldErrors<T> }
  | { ok: false; errors: FieldErrors<T> };

/**
 * Valida un formulario con un esquema de `@manhunt/types` (el mismo que usa el
 * servidor) y devuelve el primer error de cada campo, listo para pintar.
 */
export function validateForm<S extends z.ZodType>(
  schema: S,
  values: unknown,
): ValidationResult<z.output<S>> {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data, errors: {} };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors: errors as FieldErrors<z.output<S>> };
}
