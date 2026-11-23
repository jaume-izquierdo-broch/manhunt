import { ErrorCode } from '@manhunt/types';
import { useState } from 'react';
import type { z } from 'zod';
import { type FieldErrors, validateForm } from './forms';
import { ApiError, errorMessage } from './http/api-error';

export interface UseFormOptions<V, S extends z.ZodType> {
  /** A `@manhunt/types` schema (the same one the server validates with). */
  schema: S;
  initialValues: V;
  /** Receives the validated, transformed data (trimmed, lowercased...). */
  onSubmit: (data: z.output<S>) => Promise<void>;
  /** Maps a server error to field errors (e.g. "username taken"). */
  fieldErrorsFromServer?: (error: ApiError) => FieldErrors<V> | null;
}

/**
 * Form state: values, per-field errors, a general error and submission.
 * Validates on the client with the shared schema before calling the API.
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

  /** Usage: `onChangeText={setField('email')}`. Also clears that field's error. */
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

/** A server VALIDATION_ERROR carries `details: [{ path, message }]`; turn it into field errors. */
function validationDetails<V>(error: ApiError): FieldErrors<V> | null {
  if (
    error.code !== ErrorCode.VALIDATION_ERROR ||
    !Array.isArray(error.details)
  ) {
    return null;
  }
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
