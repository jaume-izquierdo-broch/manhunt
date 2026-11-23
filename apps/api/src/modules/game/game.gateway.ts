import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import {
  type Ack,
  catchAttemptSchema,
  type CatchResult,
  GAME_NAMESPACE,
  locationUpdateSchema,
  type MatchSnapshot,
  matchSubscribeSchema,
  MatchStatus,
} from '@manhunt/types';
import { parseOrThrow } from '../../common/validation/zod-validation.pipe.js';
import { withAck } from '../../common/websocket/with-ack.js';
import { SessionStore } from '../auth/session.store.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import type { GameNamespace, GameSocket } from '../realtime/realtime.types.js';
import { Rooms } from '../realtime/rooms.js';
import { createWsAuthMiddleware } from '../realtime/ws-auth.middleware.js';
import { GameErrors } from './game.errors.js';
import { GameplayService } from './gameplay.service.js';

/**
 * WebSocket entry point for live matches (namespace `/game`).
 *
 * It only translates: validates payloads, reads the user and match from the
 * socket, manages rooms and delegates to GameplayService. Every handler replies
 * with an acknowledgement.
 */
@WebSocketGateway({ namespace: GAME_NAMESPACE })
export class GameGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly sessions: SessionStore,
    private readonly realtime: RealtimePublisher,
    private readonly gameplay: GameplayService,
  ) {}

  afterInit(ns: GameNamespace) {
    ns.use(createWsAuthMiddleware(this.sessions));
    this.realtime.attach(ns);
  }

  /**
   * Personal rooms: one to reach a user on all their devices, and one per
   * session so a logout can close exactly that session's sockets.
   */
  async handleConnection(socket: GameSocket) {
    await socket.join([
      Rooms.user(socket.data.userId),
      Rooms.session(socket.data.sessionId),
    ]);
  }

  /** Clients must subscribe again after every reconnection. */
  @SubscribeMessage('match:subscribe')
  onSubscribe(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<MatchSnapshot>> {
    return withAck(this.logger, async () => {
      const { matchId } = parseOrThrow(matchSubscribeSchema, body);
      const snapshot = await this.gameplay.snapshot(
        socket.data.userId,
        matchId,
      );

      await this.leaveCurrentMatch(socket);
      socket.data.matchId = matchId;
      await socket.join(Rooms.match(matchId));
      if (snapshot.match.status !== MatchStatus.WAITING) {
        await socket.join(Rooms.team(matchId, snapshot.me.team));
      }
      return snapshot;
    });
  }

  @SubscribeMessage('location:update')
  onLocation(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ at: string }>> {
    return withAck(this.logger, () =>
      this.gameplay.updateLocation(
        socket.data.userId,
        subscribedMatchId(socket),
        parseOrThrow(locationUpdateSchema, body),
      ),
    );
  }

  @SubscribeMessage('catch:attempt')
  onCatch(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<CatchResult>> {
    return withAck(this.logger, () =>
      this.gameplay.attemptCatch(
        socket.data.userId,
        subscribedMatchId(socket),
        parseOrThrow(catchAttemptSchema, body).runnerId,
      ),
    );
  }

  private async leaveCurrentMatch(socket: GameSocket) {
    if (!socket.data.matchId) return;
    for (const room of Rooms.allOfMatch(socket.data.matchId)) {
      await socket.leave(room);
    }
  }
}

function subscribedMatchId(socket: GameSocket): string {
  if (!socket.data.matchId) throw GameErrors.notSubscribed();
  return socket.data.matchId;
}
