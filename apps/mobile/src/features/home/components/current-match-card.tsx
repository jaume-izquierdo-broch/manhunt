import { type MatchDto, MatchStatus } from '@manhunt/types';
import { AppText, Badge, type BadgeTone, Button, Card } from '@/ui';

const STATUS: Record<MatchStatus, { label: string; tone: BadgeTone }> = {
  LOBBY: { label: 'In the lobby', tone: 'accent' },
  HIDING: { label: 'Hiding', tone: 'warning' },
  ACTIVE: { label: 'Hunting', tone: 'hunter' },
  FINISHED: { label: 'Finished', tone: 'neutral' },
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
      <AppText variant="subtitle">You have an open match</AppText>
      <AppText tone="muted">
        Code {match.joinCode} · {match.players.length} players
      </AppText>
      <Button
        title={
          match.status === MatchStatus.LOBBY
            ? 'Back to the lobby'
            : 'Back to the match'
        }
        onPress={onOpen}
      />
    </Card>
  );
}
