import { Module } from '@nestjs/common';
import { LobbyModule } from '../lobby/lobby.module.js';
import { MatchesModule } from '../matches/matches.module.js';
import { LiveMatchController } from './live-match.controller.js';
import { MatchGateway } from './match.gateway.js';
import { PlayService } from './play.service.js';
import { MatchLifecycleService } from './match-lifecycle.service.js';
import { MatchTimersQueue } from './match-timers.queue.js';

/** Live matches: phases, timers, catches and the WebSocket gateway. */
@Module({
  imports: [MatchesModule, LobbyModule],
  controllers: [LiveMatchController],
  providers: [
    MatchGateway,
    PlayService,
    MatchLifecycleService,
    MatchTimersQueue,
  ],
})
export class LiveMatchModule {}
