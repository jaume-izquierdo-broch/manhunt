import { type PlayerDto, Team } from '@manhunt/types';
import { AppText, Button, Card } from '@/ui';
import { PlayerRow } from './player-row';

const TEAM_COPY = {
  [Team.HUNTER]: { title: 'Hunters', switchTo: '→ Runner', tone: 'hunter' },
  [Team.RUNNER]: { title: 'Runners', switchTo: '→ Hunter', tone: 'runner' },
} as const;

export interface TeamSectionProps {
  team: Team;
  players: PlayerDto[];
  userId: string;
  hostId: string;
  /** Host-only actions. Without them, the list is read-only. */
  onSwitchTeam?: (player: PlayerDto) => void;
  onKick?: (player: PlayerDto) => void;
}

/** One team in the lobby, with the host's controls next to each player. */
export function TeamSection({
  team,
  players,
  userId,
  hostId,
  onSwitchTeam,
  onKick,
}: TeamSectionProps) {
  const copy = TEAM_COPY[team];
  return (
    <Card>
      <AppText variant="label" tone={copy.tone}>
        {`${copy.title} (${players.length})`}
      </AppText>
      {players.length === 0 ? (
        <AppText variant="caption" tone="muted">
          Nobody yet
        </AppText>
      ) : null}
      {players.map((player) => (
        <PlayerRow
          key={player.userId}
          player={player}
          isMe={player.userId === userId}
          isHost={player.userId === hostId}
          actions={
            onSwitchTeam || onKick ? (
              <>
                {onSwitchTeam ? (
                  <Button
                    title={copy.switchTo}
                    variant="secondary"
                    compact
                    onPress={() => onSwitchTeam(player)}
                  />
                ) : null}
                {onKick && player.userId !== userId ? (
                  <Button
                    title="Kick"
                    variant="ghost"
                    compact
                    onPress={() => onKick(player)}
                  />
                ) : null}
              </>
            ) : undefined
          }
        />
      ))}
    </Card>
  );
}
