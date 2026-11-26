import { create } from 'zustand';
import type { GameSocket } from './socket';

export type RealtimeStatus =
  'offline' | 'connecting' | 'connected' | 'reconnecting';

/** The app's socket to the server. Only `useRealtimeConnection` writes it. */
interface RealtimeStore {
  socket: GameSocket | null;
  status: RealtimeStatus;
}

export const useRealtime = create<RealtimeStore>()(() => ({
  socket: null,
  status: 'offline',
}));
