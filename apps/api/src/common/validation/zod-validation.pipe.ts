import { HttpStatus, type PipeTransform } from '@nestjs/common';
import { ErrorCode } from '@manhunt/types';
import type { z } from 'zod';
import { AppError } from '../errors/app-error.js';

/**
 * Validates a value against a `@manhunt/types` schema (the same one the app uses)
 * and returns the parsed output (trimmed, defaulted, normalized...).
 * Throws a VALIDATION_ERROR whose details list every invalid field.
 */
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid data',
      HttpStatus.BAD_REQUEST,
      result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}

/** For controllers: `@Body(new ZodValidationPipe(schema)) body: Input`. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    return parseOrThrow(this.schema, value);
  }
}
