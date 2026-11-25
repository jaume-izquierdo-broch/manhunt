import { type MatchDto, type PlayerDto, Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { useInvalidateCurrentMatch } from '@/features/matches/matches.queries';
import { AppText, Button, Card, Screen } from '@/ui';
import { PlayerRow } from '../components/player-row';
import { useGameSession, useLoadedMatch } from '../session/game-session';
import { playerName, playersOfTeam } from '../state/game-state';

/** End of the match: who won, and what happened to each runner. */
export function ResultsView() {
  const { userId, state } = useGameSession();
  const match = useLoadedMatch();
  const router = useRouter();
  const invalidateCurrentMatch = useInvalidateCurrentMatch();

  const winner = match.winnerTeam;
  const myTeamWon = !!winner && state.me?.team === winner;

  const goHome = () => {
    void invalidateCurrentMatch();
    router.replace('/');
  };

  return (
    <Screen scroll footer={<Button title="Back to home" onPress={goHome} />}>
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
