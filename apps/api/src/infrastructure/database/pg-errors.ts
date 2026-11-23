const UNIQUE_VIOLATION = '23505';

/**
 * Whether `error` is a Postgres unique-constraint violation (optionally on a
 * given constraint). Drizzle wraps driver errors, so the `cause` chain is followed.
 */
export function isUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const e = current as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };
    if (e.code === UNIQUE_VIOLATION) {
      return constraint === undefined || e.constraint === constraint;
    }
    current = e.cause;
  }
  return false;
}
