import { type MatchDto, MatchStatus } from '@manhunt/types';
import { countOf } from '@/lib/format';
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
        Code {match.joinCode} · {countOf(match.players.length, 'player')}
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
