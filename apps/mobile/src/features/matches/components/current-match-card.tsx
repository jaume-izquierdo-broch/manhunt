import { type MatchDto, MatchStatus } from '@manhunt/types';
import { AppText, Badge, type BadgeTone, Button, Card } from '@/ui';

const STATUS: Record<MatchStatus, { label: string; tone: BadgeTone }> = {
  WAITING: { label: 'En la sala', tone: 'accent' },
  HIDING: { label: 'Escondite', tone: 'warning' },
  ACTIVE: { label: 'En juego', tone: 'hunter' },
  FINISHED: { label: 'Terminada', tone: 'neutral' },
};

export function CurrentMatchCard({
  match,
  onOpen,
}: {
  match: MatchDto;
  onOpen: () => void;
}) {
  const status = STATUS[match.status];
  return (
    <Card>
      <Badge label={status.label} tone={status.tone} />
      <AppText variant="subtitle">Tienes una partida abierta</AppText>
      <AppText tone="muted">
        Código {match.joinCode} · {match.players.length} jugadores
      </AppText>
      <Button
        title={
          match.status === MatchStatus.WAITING
            ? 'Volver a la sala'
            : 'Volver a la partida'
        }
        onPress={onOpen}
      />
    </Card>
  );
}
