import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis, type RedisOptions } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO sobre Redis pub/sub: con varias réplicas de la API, una emisión
 * llega a los sockets conectados a cualquiera de ellas.
 */
export class RedisIoAdapter extends IoAdapter {
  private pub?: Redis;
  private sub?: Redis;

  constructor(
    app: INestApplicationContext,
    private readonly redisOptions: RedisOptions,
    private readonly corsOrigin: string[] | boolean,
  ) {
    super(app);
  }

  async connect(): Promise<void> {
    this.pub = new Redis({
      ...this.redisOptions,
      connectionName: 'manhunt-io-pub',
    });
    this.sub = this.pub.duplicate({ connectionName: 'manhunt-io-sub' });
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin },
    } as ServerOptions) as Server;
    if (this.pub && this.sub) server.adapter(createAdapter(this.pub, this.sub));
    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    await Promise.all([
      this.pub?.quit().catch(() => undefined),
      this.sub?.quit().catch(() => undefined),
    ]);
  }
}
