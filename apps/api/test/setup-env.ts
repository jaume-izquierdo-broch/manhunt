// Locally this reads apps/api/.env; in CI the variables come from the workflow.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file.
}
process.env.NODE_ENV = 'test';
