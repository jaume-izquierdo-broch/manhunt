// En local usa apps/api/.env; en CI las variables llegan del workflow.
try {
  process.loadEnvFile('.env');
} catch {
  // sin .env
}
process.env.NODE_ENV = 'test';
