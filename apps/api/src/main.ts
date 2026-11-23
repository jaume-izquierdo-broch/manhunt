import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';
import { ENV, type Env, loadDotEnvFile } from './config/env.js';

loadDotEnvFile();

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: isProduction, colors: !isProduction }),
  });
  setupApp(app);

  const env = app.get<Env>(ENV);
  await app.listen(env.PORT, '0.0.0.0');
}

await bootstrap();
