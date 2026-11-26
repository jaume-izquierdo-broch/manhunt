import { create } from 'zustand';
import type { RealtimeSocket } from './socket';

export type RealtimeStatus =
  'offline' | 'connecting' | 'connected' | 'reconnecting';

/** The app's socket to the server. Only `useRealtimeConnection` writes it. */
interface RealtimeStore {
  socket: RealtimeSocket | null;
  status: RealtimeStatus;
}

export const useRealtime = create<RealtimeStore>()(() => ({
  socket: null,
  status: 'offline',
}));
