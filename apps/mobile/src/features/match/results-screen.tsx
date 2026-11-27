import { type MatchDto, type PlayerDto, Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { useCurrentUser } from '@/features/auth/session.store';
import { goHome } from '@/features/match/match-navigation';
import { useInvalidateCurrentMatch } from '@/features/match/match.queries';
import { AppText, Button, Card, Screen, type TextTone } from '@/ui';
import { PlayerRow } from './components/player-row';
import { useMatch, useLoadedMatch } from './match.store';
import { playerName, playersOfTeam } from './rules/players';

const HEADLINES: Record<Team | 'none', { title: string; tone: TextTone }> = {
  [Team.HUNTER]: { title: 'Hunters win!', tone: 'hunter' },
  [Team.RUNNER]: { title: 'Runners win!', tone: 'runner' },
  none: { title: 'Match ended', tone: 'default' },
};

/** End of the match: who won, and what happened to each runner. */
export function ResultsScreen() {
  const userId = useCurrentUser().user.id;
  const myTeam = useMatch((s) => s.me?.team);
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
        <AppText variant="title" tone={HEADLINES[winner ?? 'none'].tone} center>
          {HEADLINES[winner ?? 'none'].title}
        </AppText>
        <AppText center tone="muted">
          {!winner
            ? 'The host ended the match.'
            : myTeamWon
              ? 'Your team won 🎉'
              : 'Better luck next time.'}
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
  if (player.caughtBy) return `Caught by ${playerName(match, player.caughtBy)}`;
  return match.winnerTeam ? 'Survived' : 'Not caught';
}
