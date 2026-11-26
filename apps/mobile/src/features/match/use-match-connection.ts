import { useEffect } from 'react';
import { useRealtime } from '@/features/realtime/realtime.store';
import { emitWithAck } from '@/features/realtime/socket';
import { useMatch } from './match.store';

/**
 * Follows one match over the app's socket while its screen is open: subscribes
 * (again after every reconnection, which brings a full snapshot), sends each
 * match event to the store, and unsubscribes when leaving.
 */
export function useMatchConnection(matchId: string) {
  const socket = useRealtime((s) => s.socket);

  useEffect(() => {
    if (!socket) return;
    const store = useMatch.getState();
    store.reset();

    const subscribe = async () => {
      try {
        const snapshot = await emitWithAck(socket, 'match:subscribe', {
          matchId,
        });
        store.loadSnapshot(snapshot, Date.now());
      } catch (error) {
        store.failed((error as Error).message);
      }
    };

    socket.on('connect', subscribe);
    socket.on('match:updated', store.updateMatch);
    socket.on('match:closed', store.matchClosed);
    socket.on('player:position', store.teammateMoved);
    socket.on('ping:reveal', store.pingRevealed);
    socket.on('ping:notice', store.spottedByHunters);
    socket.on('player:caught', store.playerCaught);
    socket.on('match:finished', store.matchFinished);
    if (socket.connected) void subscribe();

    return () => {
      socket.off('connect', subscribe);
      socket.off('match:updated', store.updateMatch);
      socket.off('match:closed', store.matchClosed);
      socket.off('player:position', store.teammateMoved);
      socket.off('ping:reveal', store.pingRevealed);
      socket.off('ping:notice', store.spottedByHunters);
      socket.off('player:caught', store.playerCaught);
      socket.off('match:finished', store.matchFinished);
      if (socket.connected) {
        emitWithAck(socket, 'match:unsubscribe', { matchId }).catch(
          () => undefined,
        );
      }
      useMatch.getState().reset();
    };
  }, [socket, matchId]);
}
