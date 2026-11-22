import { HttpStatus, type PipeTransform } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import type { z } from 'zod';
import { AppError } from '../errors/app-error.js';

/**
 * Valida con un esquema zod de `@manhunt/types` (el mismo que usa la app)
 * y devuelve el valor ya transformado (trim, defaults, mayúsculas...).
 */
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Datos inválidos',
      HttpStatus.BAD_REQUEST,
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/** Para controladores: `@Body(new ZodValidationPipe(schema)) body: Input`. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    return parseOrThrow(this.schema, value);
  }
}
