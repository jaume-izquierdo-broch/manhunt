import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { GameModule } from './modules/game/game.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MatchesModule } from './modules/matches/matches.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';

@Module({
  imports: [
    // Global infrastructure
    ConfigModule,
    DatabaseModule,
    RedisModule,
    RealtimeModule,
    // Features
    AuthModule,
    HealthModule,
    MatchesModule,
    GameModule,
  ],
})
export class AppModule {}
