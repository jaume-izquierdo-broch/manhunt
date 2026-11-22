import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env: se usa el entorno.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://manhunt:manhunt_secret@localhost:5432/manhunt_db',
  },
  strict: true,
  verbose: true,
});
