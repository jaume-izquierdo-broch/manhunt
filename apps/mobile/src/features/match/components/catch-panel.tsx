import type { MatchDto, PingRevealPayload } from '@manhunt/types';
import { useState } from 'react';
import { Alert } from 'react-native';
import { formatDistance } from '@/lib/format';
import { errorMessage } from '@/lib/http/api-error';
import type { DevicePosition } from '@/lib/location/device-location';
import { AppText, Button, Card } from '@/ui';
import { aliveRunners } from '../rules/players';
import { distanceMeters } from '../rules/geo';
import { PlayerRow } from './player-row';

export interface CatchPanelProps {
  match: MatchDto;
  lastPing: PingRevealPayload | null;
  myPosition: DevicePosition | null;
  /** The runner whose answer to my catch I'm waiting for. */
  waitingFor: string | null;
  onCatch: (runnerId: string) => Promise<unknown>;
}

/**
 * The free runners and how far their last ping was. The server checks the real
 * distance, then the runner confirms the catch.
 */
export function CatchPanel({
  match,
  lastPing,
  myPosition,
  waitingFor,
  onCatch,
}: CatchPanelProps) {
  const [sending, setSending] = useState<string | null>(null);
  const busyWith = sending ?? waitingFor;
  const runners = aliveRunners(match);

  const tryCatch = async (runnerId: string) => {
    setSending(runnerId);
    try {
      await onCatch(runnerId);
    } catch (error) {
      Alert.alert('Catch failed', errorMessage(error));
    } finally {
      setSending(null);
    }
  };

  const pingDetail = (runnerId: string) => {
    if (waitingFor === runnerId) return 'Waiting for them to confirm…';
    const seen = lastPing?.runners.find((r) => r.userId === runnerId);
    if (!seen) return 'Not located yet';
    if (!myPosition) return 'Located (turn on GPS to see the distance)';
    return `Last ping ${formatDistance(distanceMeters(myPosition, seen))} away`;
  };

  return (
    <Card>
      <AppText variant="label">Runners</AppText>
      {runners.length === 0 ? (
        <AppText tone="muted">Nobody is free.</AppText>
      ) : (
        runners.map((runner) => (
          <PlayerRow
            key={runner.userId}
            player={runner}
            isMe={false}
            isHost={runner.userId === match.hostId}
            detail={pingDetail(runner.userId)}
            actions={
              <Button
                title="Catch"
                variant="hunter"
                compact
                loading={busyWith === runner.userId}
                disabled={busyWith !== null && busyWith !== runner.userId}
                onPress={() => tryCatch(runner.userId)}
                accessibilityHint="Only works within a few meters"
              />
            }
          />
        ))
      )}
    </Card>
  );
}
