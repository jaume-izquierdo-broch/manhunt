import { Injectable } from '@nestjs/common';
import {
  type CreateMatchInput,
  MATCH_LIMITS,
  type MatchDto,
  Team,
} from '@manhunt/types';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import {
  assertHostInLobby,
  assertInLobby,
  generateJoinCode,
} from './domain/lobby-rules.js';
import { MatchReader } from './match-reader.service.js';
import { MatchErrors } from './matches.errors.js';
import { MatchesRepository } from './matches.repository.js';

const JOIN_CODE_ATTEMPTS = 5;

/**
 * Lobby use cases (WAITING status): create, join, leave, close, change teams
 * and kick. Starting the match belongs to the `game` module.
 */
@Injectable()
export class LobbyService {
  constructor(
    private readonly repo: MatchesRepository,
    private readonly reader: MatchReader,
    private readonly realtime: RealtimePublisher,
  ) {}

  /** The creator becomes the host and joins as a hunter. */
  async create(hostId: string, input: CreateMatchInput): Promise<MatchDto> {
    await this.assertNotInOpenMatch(hostId);

    for (let attempt = 0; attempt < JOIN_CODE_ATTEMPTS; attempt++) {
      const match = await this.repo.createWithHost(
        {
          joinCode: generateJoinCode(),
          centerLat: input.playArea.lat,
          centerLng: input.playArea.lng,
          radiusMeters: input.playArea.radiusMeters,
          hidingSeconds: input.hidingSeconds,
          durationSeconds: input.durationSeconds,
          pingIntervalSeconds: input.pingIntervalSeconds,
        },
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
    if (!match) throw MatchErrors.joinCodeNotFound();

    if (await this.repo.getPlayer(match.id, userId)) {
      return this.reader.toDto(match);
    }

    assertInLobby(match);
    await this.assertNotInOpenMatch(userId);
    if ((await this.repo.countPlayers(match.id)) >= MATCH_LIMITS.maxPlayers) {
      throw MatchErrors.full();
    }

    await this.repo.addPlayer(match.id, userId, Team.RUNNER);
    return this.reader.publishUpdate(match.id);
  }

  async leave(matchId: string, userId: string): Promise<void> {
    const { match } = await this.reader.getMembershipOrThrow(matchId, userId);
    assertInLobby(match, 'You cannot leave a match that has started');
    if (match.hostId === userId) throw MatchErrors.hostCannotLeave();
    await this.removePlayer(matchId, userId);
  }

  async kick(
    matchId: string,
    hostId: string,
    targetId: string,
  ): Promise<MatchDto> {
    const match = await this.reader.getOrThrow(matchId);
    assertHostInLobby(match, hostId);
    if (targetId === hostId) throw MatchErrors.cannotKickHost();
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

    this.realtime.toMatch(matchId, 'match:closed', { matchId });
    for (const p of players) this.realtime.removeFromMatch(matchId, p.userId);
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
    this.realtime.removeFromMatch(matchId, userId);
    await this.reader.publishUpdate(matchId);
  }

  private async assertNotInOpenMatch(userId: string) {
    const open = await this.repo.findOpenForUser(userId);
    if (open) throw MatchErrors.alreadyInMatch(open.id);
  }
}
