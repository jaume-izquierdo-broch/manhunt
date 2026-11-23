import type { MatchDto, PingRevealPayload } from '@manhunt/types';
import { useState } from 'react';
import { Alert } from 'react-native';
import { formatDistance } from '@/lib/format';
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
 * Lista de escapadores libres con su distancia al último ping.
 * La captura la valida el servidor (distancia real y posiciones recientes).
 */
export function CatchPanel({
  match,
  lastPing,
  myPosition,
  onCatch,
}: CatchPanelProps) {
  const [pending, setPending] = useState<string | null>(null);
  const runners = aliveRunners(match);

  const tryCatch = async (runnerId: string) => {
    setPending(runnerId);
    try {
      await onCatch(runnerId);
    } catch (error) {
      Alert.alert('No se ha podido capturar', (error as Error).message);
    } finally {
      setPending(null);
    }
  };

  const pingDetail = (runnerId: string) => {
    const seen = lastPing?.runners.find((r) => r.userId === runnerId);
    if (!seen) return 'Sin localizar todavía';
    if (!myPosition) return 'Localizado (activa tu GPS para ver la distancia)';
    return `Último ping a ${formatDistance(distanceMeters(myPosition, seen))}`;
  };

  return (
    <Card>
      <AppText variant="label">Escapadores</AppText>
      {runners.length === 0 ? (
        <AppText tone="muted">No queda nadie libre.</AppText>
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
                title="Capturar"
                variant="hunter"
                compact
                loading={pending === runner.userId}
                disabled={pending !== null && pending !== runner.userId}
                onPress={() => tryCatch(runner.userId)}
                accessibilityHint="Solo funciona si estás a pocos metros"
              />
            }
          />
        ))
      )}
    </Card>
  );
}
