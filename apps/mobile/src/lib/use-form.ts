import { useState } from 'react';
import type { z } from 'zod';
import { type FieldErrors, validateForm } from './forms';
import { ApiError, errorMessage } from './http/api-error';

export interface UseFormOptions<V, S extends z.ZodType> {
  /** Esquema de `@manhunt/types` (el mismo que valida el servidor). */
  schema: S;
  initialValues: V;
  /** Recibe los datos ya validados y transformados (trim, minúsculas...). */
  onSubmit: (data: z.output<S>) => Promise<void>;
  /** Convierte un error del servidor en errores de campo (p. ej. "usuario repetido"). */
  fieldErrorsFromServer?: (error: ApiError) => FieldErrors<V> | null;
}

/**
 * Estado de un formulario: valores, errores por campo, error general y envío.
 * Valida en el cliente con el esquema compartido antes de llamar a la API.
 */
export function useForm<
  V extends Record<string, unknown>,
  S extends z.ZodType,
>({
  schema,
  initialValues,
  onSubmit,
  fieldErrorsFromServer,
}: UseFormOptions<V, S>) {
  const [values, setValues] = useState<V>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<V>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** `onChangeText={setField('email')}` — también limpia el error de ese campo. */
  const setField =
    <K extends keyof V & string>(field: K) =>
    (value: V[K]) => {
      setValues((v) => ({ ...v, [field]: value }));
      setErrors((e) => ({ ...e, [field]: undefined }));
    };

  const submit = async () => {
    if (submitting) return;
    const result = validateForm(schema, values);
    setErrors(result.errors as FieldErrors<V>);
    if (!result.ok) return;

    setFormError(null);
    setSubmitting(true);
    try {
      await onSubmit(result.data);
    } catch (error) {
      const fieldErrors =
        error instanceof ApiError
          ? (fieldErrorsFromServer?.(error) ?? validationDetails<V>(error))
          : null;
      if (fieldErrors) setErrors(fieldErrors);
      else setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return { values, errors, formError, submitting, setField, submit };
}

/** `VALIDATION_ERROR` del servidor trae `details: [{ path, message }]`: a errores de campo. */
function validationDetails<V>(error: ApiError): FieldErrors<V> | null {
  if (error.code !== 'VALIDATION_ERROR' || !Array.isArray(error.details))
    return null;
  const errors: Record<string, string> = {};
  for (const d of error.details as { path?: unknown; message?: unknown }[]) {
    if (
      typeof d.path === 'string' &&
      typeof d.message === 'string' &&
      !errors[d.path]
    ) {
      errors[d.path] = d.message;
    }
  }
  return Object.keys(errors).length ? (errors as FieldErrors<V>) : null;
}
