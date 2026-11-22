import { Injectable } from '@nestjs/common';
import type { MatchDto } from '@manhunt/types';
import type {
  MatchPlayerRow,
  MatchRow,
} from '../../infrastructure/database/schema.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import { toMatchDto } from './match.mapper.js';
import { MatchErrors } from './matches.errors.js';
import { MatchesRepository } from './matches.repository.js';

export interface Membership {
  match: MatchRow;
  player: MatchPlayerRow;
}

/**
 * Lecturas compartidas por la sala (`LobbyService`) y el juego (`game` module):
 * cargar con comprobaciones, construir el DTO y difundir el estado actualizado.
 */
@Injectable()
export class MatchReader {
  constructor(
    private readonly repo: MatchesRepository,
    private readonly realtime: RealtimePublisher,
  ) {}

  async getOrThrow(matchId: string): Promise<MatchRow> {
    const match = await this.repo.findById(matchId);
    if (!match) throw MatchErrors.notFound();
    return match;
  }

  /** La partida y el jugador; lanza si el usuario no participa. */
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
    return toMatchDto(match, await this.repo.listPlayerViews(match.id));
  }

  async getDtoForMember(matchId: string, userId: string): Promise<MatchDto> {
    const { match } = await this.getMembershipOrThrow(matchId, userId);
    return this.toDto(match);
  }

  async getOpenDtoForUser(userId: string): Promise<MatchDto | null> {
    const match = await this.repo.findOpenForUser(userId);
    return match ? this.toDto(match) : null;
  }

  /** Envía `match:updated` con el estado actual a todos los suscritos. Devuelve el DTO. */
  async publishUpdate(matchId: string): Promise<MatchDto | null> {
    const match = await this.repo.findById(matchId);
    if (!match) return null;
    const dto = await this.toDto(match);
    this.realtime.toMatch(matchId, 'match:updated', dto);
    return dto;
  }
}
