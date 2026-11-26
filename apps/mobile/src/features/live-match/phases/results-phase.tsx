import { type MatchDto, type PlayerDto, Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { useCurrentUser } from '@/features/auth/session.store';
import { goHome } from '@/features/matches/match-navigation';
import { useInvalidateCurrentMatch } from '@/features/matches/matches.queries';
import { AppText, Button, Card, Screen } from '@/ui';
import { PlayerRow } from '../components/player-row';
import { useLiveMatch, useLoadedMatch } from '../live-match.store';
import { playerName, playersOfTeam } from '../rules/players';

/** End of the match: who won, and what happened to each runner. */
export function ResultsPhase() {
  const userId = useCurrentUser().user.id;
  const myTeam = useLiveMatch((s) => s.me?.team);
  const match = useLoadedMatch();
  const router = useRouter();
  const invalidateCurrentMatch = useInvalidateCurrentMatch();

  const winner = match.winnerTeam;
  const myTeamWon = !!winner && myTeam === winner;

  const backHome = () => {
    void invalidateCurrentMatch();
    goHome(router);
  };

  return (
    <Screen scroll footer={<Button title="Back to home" onPress={backHome} />}>
      <Card>
        <AppText
          variant="title"
          tone={winner === Team.HUNTER ? 'hunter' : 'runner'}
          center
        >
          {winner === Team.HUNTER ? 'Hunters win!' : 'Runners win!'}
        </AppText>
        <AppText center tone="muted">
          {myTeamWon ? 'Your team won 🎉' : 'Better luck next time.'}
        </AppText>
      </Card>

      {[Team.RUNNER, Team.HUNTER].map((team) => (
        <Card key={team}>
          <AppText
            variant="label"
            tone={team === Team.HUNTER ? 'hunter' : 'runner'}
          >
            {team === Team.HUNTER ? 'Hunters' : 'Runners'}
          </AppText>
          {playersOfTeam(match, team).map((player) => (
            <PlayerRow
              key={player.userId}
              player={player}
              isMe={player.userId === userId}
              isHost={player.userId === match.hostId}
              detail={runnerOutcome(match, player)}
            />
          ))}
        </Card>
      ))}
    </Screen>
  );
}

function runnerOutcome(match: MatchDto, player: PlayerDto): string | undefined {
  if (player.team !== Team.RUNNER) return undefined;
  return player.caughtBy
    ? `Caught by ${playerName(match, player.caughtBy)}`
    : 'Survived';
}
