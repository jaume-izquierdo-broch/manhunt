import { Global, Module } from '@nestjs/common';
import { RealtimePublisher } from './realtime.publisher.js';

/**
 * Global, so any module can emit events by injecting RealtimePublisher.
 * The gateway that receives client events lives in the `live-match` module.
 */
@Global()
@Module({
  providers: [RealtimePublisher],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
