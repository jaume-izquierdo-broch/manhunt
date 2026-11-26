// Questions about the players of a match. Pure functions: no state, no network.
import {
  type MatchDto,
  MatchStatus,
  type PlayerDto,
  PlayerStatus,
  Team,
} from '@manhunt/types';

/** Hiding or hunting: the phases where GPS and the map matter. */
export const isLive = (status: MatchStatus | undefined) =>
  status === MatchStatus.HIDING || status === MatchStatus.ACTIVE;

export function playersOfTeam(match: MatchDto, team: Team): PlayerDto[] {
  return match.players.filter((p) => p.team === team);
}

export function aliveRunners(match: MatchDto): PlayerDto[] {
  return match.players.filter(
    (p) => p.team === Team.RUNNER && p.status === PlayerStatus.ALIVE,
  );
}

export function playerName(match: MatchDto | null, userId: string): string {
  return match?.players.find((p) => p.userId === userId)?.username ?? 'Someone';
}

/** A match can only start with at least one hunter and one runner. */
export function hasBalancedTeams(match: MatchDto): boolean {
  return (
    playersOfTeam(match, Team.HUNTER).length > 0 &&
    playersOfTeam(match, Team.RUNNER).length > 0
  );
}
