import type { MatchDto, PingRevealPayload } from '@manhunt/types';
import { useState } from 'react';
import { Alert } from 'react-native';
import { formatDistance } from '@/lib/format';
import { errorMessage } from '@/lib/http/api-error';
import type { DevicePosition } from '@/lib/location/device-location';
import { AppText, Button, Card } from '@/ui';
import { distanceMeters } from '../domain/geo';
import { aliveRunners } from '../state/game-state';
import { PlayerRow } from './player-row';

export interface CatchPanelProps {
  match: MatchDto;
  lastPing: PingRevealPayload | null;
  myPosition: DevicePosition | null;
  onCatch: (runnerId: string) => Promise<unknown>;
}

/**
 * The free runners and how far their last ping was. The server is the one that
 * validates a catch (real distance and recent positions).
 */
export function CatchPanel({
  match,
  lastPing,
  myPosition,
  onCatch,
}: CatchPanelProps) {
  const [pendingRunnerId, setPendingRunnerId] = useState<string | null>(null);
  const runners = aliveRunners(match);

  const tryCatch = async (runnerId: string) => {
    setPendingRunnerId(runnerId);
    try {
      await onCatch(runnerId);
    } catch (error) {
      Alert.alert('Catch failed', errorMessage(error));
    } finally {
      setPendingRunnerId(null);
    }
  };

  const pingDetail = (runnerId: string) => {
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
                loading={pendingRunnerId === runner.userId}
                disabled={
                  pendingRunnerId !== null && pendingRunnerId !== runner.userId
                }
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
