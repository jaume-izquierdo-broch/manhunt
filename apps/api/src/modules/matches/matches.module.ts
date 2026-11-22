import { Module } from '@nestjs/common';
import { LobbyService } from './lobby.service.js';
import { MatchReader } from './match-reader.service.js';
import { MatchesController } from './matches.controller.js';
import { MatchesRepository } from './matches.repository.js';

/** Partidas: persistencia, consultas y sala (WAITING). */
@Module({
  controllers: [MatchesController],
  providers: [MatchesRepository, MatchReader, LobbyService],
  exports: [MatchesRepository, MatchReader],
})
export class MatchesModule {}
