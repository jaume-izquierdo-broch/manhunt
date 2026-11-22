/** Violación de UNIQUE de Postgres (también cuando Drizzle la envuelve en `cause`). */
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
    if (e.code === '23505') {
      return constraint === undefined || e.constraint === constraint;
    }
    current = e.cause;
  }
  return false;
}
