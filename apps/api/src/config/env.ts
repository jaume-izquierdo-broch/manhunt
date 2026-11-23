import { Inject } from '@nestjs/common';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

/** Environment variables, validated once at startup: the API refuses to start if any is invalid. */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  RUN_MIGRATIONS: booleanFromString.default(true),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  /** A session expires after this long WITHOUT being used (every request extends it). */
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),

  /** Comma-separated list of allowed origins, or "*". Only affects browser clients. */
  CORS_ORIGIN: z.string().default('*'),

  /** Maximum hunter-runner distance (meters) for a catch to count. */
  CATCH_RADIUS_METERS: z.coerce.number().positive().default(25),
  /** Maximum age (seconds) of a position for it to be used in a catch. */
  POSITION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

/** DI token for the validated environment. */
export const ENV = Symbol('ENV');

/** Usage: `constructor(@InjectEnv() env: Env)`. */
export const InjectEnv = () => Inject(ENV);

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

/** Loads `.env` when present. In Docker and CI the variables come from the environment. */
export function loadDotEnvFile(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // No .env file: nothing to load.
  }
}

/** "*" allows every origin; otherwise a comma-separated list. */
export function parseCorsOrigin(value: string): string[] | boolean {
  if (value.trim() === '*') return true;
  return value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
