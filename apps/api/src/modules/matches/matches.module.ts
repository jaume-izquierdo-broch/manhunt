import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service.js';
import { MatchReader } from './match-reader.service.js';
import { MatchesController } from './matches.controller.js';
import { MatchesRepository } from './matches.repository.js';
import { PositionsStore } from './positions.store.js';

/** Matches: persistence, queries, players' positions and the lobby (WAITING). */
@Module({
  controllers: [MatchesController],
  providers: [MatchesRepository, MatchReader, LobbyService, PositionsStore],
  exports: [MatchesRepository, MatchReader, LobbyService, PositionsStore],
})
export class MatchesModule {}
