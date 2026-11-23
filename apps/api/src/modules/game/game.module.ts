import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module.js';
import { GameController } from './game.controller.js';
import { GameGateway } from './game.gateway.js';
import { GameplayService } from './gameplay.service.js';
import { MatchLifecycleService } from './match-lifecycle.service.js';
import { MatchTimersQueue } from './match-timers.queue.js';
import { PositionsStore } from './positions.store.js';

/** Live matches: phases, timers, positions, catches and the WebSocket gateway. */
@Module({
  imports: [MatchesModule],
  controllers: [GameController],
  providers: [
    GameGateway,
    GameplayService,
    MatchLifecycleService,
    MatchTimersQueue,
    PositionsStore,
  ],
})
export class GameModule {}
