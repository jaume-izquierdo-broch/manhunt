import { Injectable } from '@nestjs/common';
import {
  type LocationUpdatePayload,
  MATCH_LIMITS,
  type MatchDto,
  type MatchSettings,
  type PositionDto,
  Team,
} from '@manhunt/types';
import type { MatchRow } from '../../infrastructure/database/schema.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import {
  assertHostInLobby,
  assertInLobby,
  generateJoinCode,
  shouldPublishLobbyLocation,
} from './domain/lobby-rules.js';
import { MatchReader } from '../matches/match-reader.service.js';
import { MatchErrors } from '../matches/matches.errors.js';
import { MatchesRepository } from '../matches/matches.repository.js';
import { PositionsStore } from '../matches/positions.store.js';
import { LobbyErrors } from './lobby.errors.js';

const JOIN_CODE_ATTEMPTS = 5;

/**
 * Lobby use cases (LOBBY status): create, join, leave, close, settings,
 * teams, kicks and players' locations. Starting the match belongs to `live-match`.
 */
@Injectable()
export class LobbyService {
  constructor(
    private readonly repo: MatchesRepository,
    private readonly reader: MatchReader,
    private readonly realtime: RealtimePublisher,
    private readonly positions: PositionsStore,
  ) {}

  /** The creator becomes the host and joins as a hunter. */
  async create(hostId: string, settings: MatchSettings): Promise<MatchDto> {
    await this.assertNotInOpenMatch(hostId);

    for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt++) {
      const match = await this.repo.createWithHost(
        { joinCode: generateJoinCode(), ...settings },
        hostId,
      );
      // null means the join code collided with an existing one: try another.
      if (match) return this.reader.toDto(match);
    }
    throw new Error('Could not generate a unique join code');
  }

  /** New players join as runners. Joining again is a no-op. */
  async join(userId: string, joinCode: string): Promise<MatchDto> {
    const match = await this.repo.findByJoinCode(joinCode);
    if (!match) throw LobbyErrors.joinCodeNotFound();

    if (await this.repo.getPlayer(match.id, userId)) {
      return this.reader.toDto(match);
    }

    assertInLobby(match);
    await this.assertNotInOpenMatch(userId);
    if ((await this.repo.countPlayers(match.id)) >= MATCH_LIMITS.maxPlayers) {
      throw LobbyErrors.full();
    }

    await this.repo.addPlayer(match.id, userId, Team.RUNNER);
    return this.reader.publishUpdate(match.id);
  }

  async leave(matchId: string, userId: string): Promise<void> {
    const { match } = await this.reader.getMembershipOrThrow(matchId, userId);
    assertInLobby(match, 'You cannot leave a match that has started');
    if (match.hostId === userId) throw LobbyErrors.hostCannotLeave();
    await this.removePlayer(matchId, userId);
  }

  async kick(
    matchId: string,
    hostId: string,
    targetId: string,
  ): Promise<MatchDto> {
    const match = await this.reader.getOrThrow(matchId);
    assertHostInLobby(match, hostId);
    if (targetId === hostId) throw LobbyErrors.cannotKickHost();
    if (!(await this.repo.getPlayer(matchId, targetId))) {
      throw MatchErrors.playerNotFound();
    }

    this.realtime.toUser(targetId, 'match:closed', { matchId });
    await this.removePlayer(matchId, targetId);
    return this.reader.toDto(match);
  }

  async close(matchId: string, hostId: string): Promise<void> {
    const match = await this.reader.getOrThrow(matchId);
    assertHostInLobby(match, hostId);

    const players = await this.repo.listPlayers(matchId);
    await this.repo.delete(matchId);
    await this.positions.clear(matchId);

    // The host already knows: they closed it.
    this.realtime.toOthersInMatch(matchId, hostId, 'match:closed', { matchId });
    for (const p of players) this.realtime.removeFromMatch(matchId, p.userId);
  }

  async updateSettings(
    matchId: string,
    hostId: string,
    settings: MatchSettings,
  ): Promise<MatchDto> {
    assertHostInLobby(await this.reader.getOrThrow(matchId), hostId);
    if (!(await this.repo.updateSettings(matchId, settings))) {
      throw MatchErrors.invalidStatus('The match has already started');
    }
    return this.reader.publishUpdate(matchId);
  }

  /** Keeps the player's location so everyone sees who is ready to start. */
  async reportLocation(
    match: MatchRow,
    userId: string,
    input: LocationUpdatePayload,
  ): Promise<{ at: string }> {
    const position: PositionDto = {
      userId,
      lat: input.lat,
      lng: input.lng,
      accuracy: input.accuracy ?? null,
      at: new Date().toISOString(),
    };
    const previous = await this.positions.get(match.id, userId);
    await this.positions.set(match.id, position);
    if (shouldPublishLobbyLocation(previous, position)) {
      await this.reader.publishUpdate(match.id);
    }
    return { at: position.at };
  }

  async setTeam(
    matchId: string,
    hostId: string,
    targetId: string,
    team: Team,
  ): Promise<MatchDto> {
    const match = await this.reader.getOrThrow(matchId);
    assertHostInLobby(match, hostId);
    if (!(await this.repo.setPlayerTeam(matchId, targetId, team))) {
      throw MatchErrors.playerNotFound();
    }
    return this.reader.publishUpdate(matchId);
  }

  private async removePlayer(matchId: string, userId: string) {
    await this.repo.removePlayer(matchId, userId);
    await this.positions.remove(matchId, userId);
    this.realtime.removeFromMatch(matchId, userId);
    await this.reader.publishUpdate(matchId);
  }

  private async assertNotInOpenMatch(userId: string) {
    const open = await this.repo.findOpenForUser(userId);
    if (open) throw MatchErrors.alreadyInMatch(open.id);
  }
}
