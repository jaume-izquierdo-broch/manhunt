import { Global, Module } from '@nestjs/common';
import { RealtimePublisher } from './realtime.publisher.js';

/**
 * Global: cualquier módulo puede emitir eventos inyectando RealtimePublisher.
 * El gateway que recibe eventos de los clientes vive en el módulo `game`.
 */
@Global()
@Module({
  providers: [RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
