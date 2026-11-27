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
  type CatchClaim,
  catchAnswerSchema,
  REALTIME_NAMESPACE,
  locationUpdateSchema,
  type MatchSnapshot,
  matchSubscribeSchema,
  MatchStatus,
  matchUnsubscribeSchema,
} from '@manhunt/types';
import { parseOrThrow } from '../../common/validation/zod-validation.pipe.js';
import { withAck } from '../../common/websocket/with-ack.js';
import { SessionStore } from '../auth/session.store.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import type {
  RealtimeNamespace,
  RealtimeSocket,
} from '../realtime/realtime.types.js';
import { Rooms } from '../realtime/rooms.js';
import { createWsAuthMiddleware } from '../realtime/ws-auth.middleware.js';
import { LiveMatchErrors } from './live-match.errors.js';
import { PlayService } from './play.service.js';

/**
 * Entry point of the realtime connection (namespace `/realtime`): authenticates
 * each socket, puts it in its personal rooms and handles the match events, for
 * a lobby or a live match.
 *
 * It only translates: validates payloads, reads the user and match from the
 * socket, manages rooms and delegates to PlayService. Every handler replies
 * with an acknowledgement.
 */
@WebSocketGateway({ namespace: REALTIME_NAMESPACE })
export class MatchGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(MatchGateway.name);

  constructor(
    private readonly sessions: SessionStore,
    private readonly realtime: RealtimePublisher,
    private readonly play: PlayService,
  ) {}

  afterInit(ns: RealtimeNamespace) {
    ns.use(createWsAuthMiddleware(this.sessions));
    this.realtime.attach(ns);
  }

  /**
   * Personal rooms: one to reach a user on all their devices, and one per
   * session so a logout can close exactly that session's sockets.
   */
  async handleConnection(socket: RealtimeSocket) {
    await socket.join([
      Rooms.user(socket.data.userId),
      Rooms.session(socket.data.sessionId),
    ]);
  }

  /** Clients must subscribe again after every reconnection. */
  @SubscribeMessage('match:subscribe')
  onSubscribe(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<MatchSnapshot>> {
    return withAck(this.logger, async () => {
      const { matchId } = parseOrThrow(matchSubscribeSchema, body);
      const snapshot = await this.play.snapshot(socket.data.userId, matchId);

      await this.leaveCurrentMatch(socket);
      socket.data.matchId = matchId;
      await socket.join(Rooms.match(matchId));
      if (snapshot.match.status !== MatchStatus.LOBBY) {
        await socket.join(Rooms.team(matchId, snapshot.me.team));
      }
      return snapshot;
    });
  }

  /** The socket stays open for the whole session: leaving a match screen only leaves its rooms. */
  @SubscribeMessage('match:unsubscribe')
  onUnsubscribe(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<null>> {
    return withAck(this.logger, async () => {
      const { matchId } = parseOrThrow(matchUnsubscribeSchema, body);
      if (socket.data.matchId === matchId) {
        await this.leaveCurrentMatch(socket);
        socket.data.matchId = undefined;
      }
      return null;
    });
  }

  @SubscribeMessage('location:update')
  onLocation(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ at: string }>> {
    return withAck(this.logger, () =>
      this.play.updateLocation(
        socket.data.userId,
        subscribedMatchId(socket),
        parseOrThrow(locationUpdateSchema, body),
      ),
    );
  }

  @SubscribeMessage('catch:attempt')
  onCatch(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<CatchClaim>> {
    return withAck(this.logger, () =>
      this.play.attemptCatch(
        socket.data.userId,
        subscribedMatchId(socket),
        parseOrThrow(catchAttemptSchema, body).runnerId,
      ),
    );
  }

  @SubscribeMessage('catch:answer')
  onCatchAnswer(
    @ConnectedSocket() socket: RealtimeSocket,
    @MessageBody() body: unknown,
  ): Promise<Ack<null>> {
    return withAck(this.logger, () =>
      this.play.answerCatch(
        socket.data.userId,
        subscribedMatchId(socket),
        parseOrThrow(catchAnswerSchema, body).caught,
      ),
    );
  }

  private async leaveCurrentMatch(socket: RealtimeSocket) {
    if (!socket.data.matchId) return;
    for (const room of Rooms.allOfMatch(socket.data.matchId)) {
      await socket.leave(room);
    }
  }
}

function subscribedMatchId(socket: RealtimeSocket): string {
  if (!socket.data.matchId) throw LiveMatchErrors.notSubscribed();
  return socket.data.matchId;
}
