import { Team } from '@manhunt/types';
import { useRouter } from 'expo-router';
import { useInvalidateCurrentMatch } from '@/features/matches/matches.queries';
import { AppText, Button, Card, Screen } from '@/ui';
import { PlayerRow } from '../components/player-row';
import { useGameSession, useLoadedMatch } from '../session/game-session';
import { playerName, playersOfTeam } from '../state/game-state';

/** Fin de la partida: quién ha ganado y qué le pasó a cada escapador. */
export function ResultsView() {
  const { userId, state } = useGameSession();
  const match = useLoadedMatch();
  const router = useRouter();
  const invalidateCurrent = useInvalidateCurrentMatch();

  const winner = match.winnerTeam;
  const iWon = !!winner && state.me?.team === winner;

  const goHome = () => {
    void invalidateCurrent();
    router.replace('/');
  };

  return (
    <Screen
      scroll
      footer={<Button title="Volver al inicio" onPress={goHome} />}
    >
      <Card>
        <AppText
          variant="title"
          tone={winner === Team.HUNTER ? 'hunter' : 'runner'}
          center
        >
          {winner === Team.HUNTER
            ? '¡Ganan los cazadores!'
            : '¡Ganan los escapadores!'}
        </AppText>
        <AppText center tone="muted">
          {iWon ? 'Tu equipo ha ganado 🎉' : 'Esta vez no ha podido ser.'}
        </AppText>
      </Card>

      {[Team.RUNNER, Team.HUNTER].map((team) => (
        <Card key={team}>
          <AppText
            variant="label"
            tone={team === Team.HUNTER ? 'hunter' : 'runner'}
          >
            {team === Team.HUNTER ? 'Cazadores' : 'Escapadores'}
          </AppText>
          {playersOfTeam(match, team).map((player) => (
            <PlayerRow
              key={player.userId}
              player={player}
              isMe={player.userId === userId}
              isHost={player.userId === match.hostId}
              detail={
                team === Team.RUNNER
                  ? player.caughtBy
                    ? `Capturado por ${playerName(match, player.caughtBy)}`
                    : 'Sobrevivió'
                  : undefined
              }
            />
          ))}
        </Card>
      ))}
    </Screen>
  );
}
