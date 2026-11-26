import { Module } from '@nestjs/common';
import { MatchReader } from './match-reader.service.js';
import { MatchesController } from './matches.controller.js';
import { MatchesRepository } from './matches.repository.js';
import { PositionsStore } from './positions.store.js';

/** The match itself, shared by `lobby` and `live-match`: storage, queries and positions. */
@Module({
  controllers: [MatchesController],
  providers: [MatchesRepository, MatchReader, PositionsStore],
  exports: [MatchesRepository, MatchReader, PositionsStore],
})
export class MatchesModule {}
