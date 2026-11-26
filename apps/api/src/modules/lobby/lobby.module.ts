import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module.js';
import { LobbyController } from './lobby.controller.js';
import { LobbyService } from './lobby.service.js';

/** The lobby (LOBBY status): create, join, rules, teams and who is ready. */
@Module({
  imports: [MatchesModule],
  controllers: [LobbyController],
  providers: [LobbyService],
  exports: [LobbyService],
})
export class LobbyModule {}
