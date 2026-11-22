import { Global, Inject, Module } from '@nestjs/common';
import { loadEnv } from './env.js';

export const ENV = Symbol('ENV');

/** Inyecta la configuración validada: `constructor(@InjectEnv() env: Env)`. */
export const InjectEnv = () => Inject(ENV);

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: () => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
