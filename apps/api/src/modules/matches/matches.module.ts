import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service.js';
import { MatchReader } from './match-reader.service.js';
import { MatchesController } from './matches.controller.js';
import { MatchesRepository } from './matches.repository.js';

/** Matches: persistence, queries and the lobby (WAITING). */
@Module({
  controllers: [MatchesController],
  providers: [MatchesRepository, MatchReader, LobbyService],
  exports: [MatchesRepository, MatchReader],
})
export class MatchesModule {}
