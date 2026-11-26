import { Injectable } from '@nestjs/common';
import { type MatchDto, MatchStatus } from '@manhunt/types';
import type {
  MatchPlayerRow,
  MatchRow,
} from '../../infrastructure/database/schema.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { toMatchDto } from './match.mapper.js';
import { MatchErrors } from './matches.errors.js';
import { MatchesRepository } from './matches.repository.js';
import { PositionsStore } from './positions.store.js';

export interface Membership {
  match: MatchRow;
  player: MatchPlayerRow;
}

/**
 * Reads shared by the lobby and the `live-match` module: load with access checks,
 * build the DTO, and broadcast the latest state.
 */
@Injectable()
export class MatchReader {
  constructor(
    private readonly repo: MatchesRepository,
    private readonly realtime: RealtimePublisher,
    private readonly positions: PositionsStore,
  ) {}

  async getOrThrow(matchId: string): Promise<MatchRow> {
    const match = await this.repo.findById(matchId);
    if (!match) throw MatchErrors.notFound();
    return match;
  }

  /** The match and the user's player row. Throws if the user isn't in the match. */
  async getMembershipOrThrow(
    matchId: string,
    userId: string,
  ): Promise<Membership> {
    const match = await this.getOrThrow(matchId);
    const player = await this.repo.getPlayer(matchId, userId);
    if (!player) throw MatchErrors.notInMatch();
    return { match, player };
  }

  async toDto(match: MatchRow): Promise<MatchDto> {
    const players = await this.repo.listPlayerViews(match.id);
    const lobbyPositions =
      match.status === MatchStatus.LOBBY
        ? await this.positions.getMany(
            match.id,
            players.map((p) => p.userId),
          )
        : [];
    return toMatchDto(match, players, lobbyPositions);
  }

  async getDtoForMember(matchId: string, userId: string): Promise<MatchDto> {
    const { match } = await this.getMembershipOrThrow(matchId, userId);
    return this.toDto(match);
  }

  async getOpenDtoForUser(userId: string): Promise<MatchDto | null> {
    const match = await this.repo.findOpenForUser(userId);
    return match ? this.toDto(match) : null;
  }

  /** Sends the current state to every subscriber (`match:updated`) and returns it. */
  async publishUpdate(matchId: string): Promise<MatchDto> {
    const dto = await this.toDto(await this.getOrThrow(matchId));
    this.realtime.toMatch(matchId, 'match:updated', dto);
    return dto;
  }
}
