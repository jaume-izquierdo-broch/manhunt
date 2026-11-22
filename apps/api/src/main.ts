import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { ENV } from './config/config.module.js';
import { type Env, loadDotEnvFile } from './config/env.js';

loadDotEnvFile();

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    // En producción, logs en JSON (una línea por evento) para el agregador de logs.
    logger: new ConsoleLogger({ json: isProduction, colors: !isProduction }),
  });
  await setupApp(app);

  const env = app.get<Env>(ENV);
  await app.listen(env.PORT, '0.0.0.0');
}

await bootstrap();
