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
import { TokenService } from '../auth/token.service.js';
import { RealtimePublisher } from '../realtime/realtime.publisher.js';
import type { GameNamespace, GameSocket } from '../realtime/realtime.types.js';
import { Rooms } from '../realtime/rooms.js';
import { createWsAuthMiddleware } from '../realtime/ws-auth.middleware.js';
import { GameErrors } from './game.errors.js';
import { GameplayService } from './gameplay.service.js';

/**
 * Entrada WebSocket de la partida (namespace `/game`).
 *
 * Solo traduce: valida el payload, saca el usuario/partida del socket, gestiona
 * salas y delega en GameplayService. Cada handler responde con un ack.
 */
@WebSocketGateway({ namespace: GAME_NAMESPACE })
export class GameGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(GameGateway.name);

  constructor(
    private readonly tokens: TokenService,
    private readonly realtime: RealtimePublisher,
    private readonly gameplay: GameplayService,
  ) {}

  afterInit(ns: GameNamespace) {
    ns.use(createWsAuthMiddleware(this.tokens));
    this.realtime.attach(ns);
  }

  /** Sala personal: permite enviar eventos a un usuario aunque tenga varios sockets. */
  async handleConnection(socket: GameSocket) {
    await socket.join(Rooms.user(socket.data.userId));
  }

  /** Suscribirse a una partida. Hay que repetirlo tras cada reconexión. */
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
        subscribedMatch(socket),
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
        subscribedMatch(socket),
        parseOrThrow(catchAttemptSchema, body).runnerId,
      ),
    );
  }

  private async leaveCurrentMatch(socket: GameSocket) {
    if (socket.data.matchId) {
      for (const room of Rooms.allOfMatch(socket.data.matchId)) {
        await socket.leave(room);
      }
    }
  }
}

function subscribedMatch(socket: GameSocket): string {
  if (!socket.data.matchId) throw GameErrors.notSubscribed();
  return socket.data.matchId;
}
