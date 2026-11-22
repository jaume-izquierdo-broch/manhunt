// Variables de entorno: se validan UNA vez al arrancar; si falta algo, la API no arranca.
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

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

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 7),

  /** Orígenes permitidos (separados por coma) o "*". Solo afecta a clientes web. */
  CORS_ORIGIN: z.string().default('*'),

  /** Distancia máxima (m) entre cazador y escapador para que cuente la captura. */
  CATCH_RADIUS_METERS: z.coerce.number().positive().default(25),
  /** Antigüedad máxima (s) de una posición para usarla en una captura. */
  POSITION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${issues}`);
  }
  return parsed.data;
}

/** Carga `.env` si existe (en Docker/CI las variables llegan por el entorno). */
export function loadDotEnvFile(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // No hay .env: no pasa nada.
  }
}

export function parseCorsOrigin(value: string): string[] | boolean {
  if (value.trim() === '*') return true;
  return value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
