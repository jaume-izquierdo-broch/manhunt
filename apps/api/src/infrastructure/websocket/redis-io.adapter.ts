import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis, type RedisOptions } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO over Redis pub/sub. With several API replicas, an event emitted by
 * one of them reaches sockets connected to any of them.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly clients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly redisOptions: RedisOptions,
    private readonly corsOrigin: string[] | boolean,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigin },
    } as ServerOptions) as Server;

    const pub = new Redis({
      ...this.redisOptions,
      connectionName: 'manhunt-io-pub',
    });
    const sub = pub.duplicate({ connectionName: 'manhunt-io-sub' });
    this.clients.push(pub, sub);
    server.adapter(createAdapter(pub, sub));
    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    await Promise.all(
      this.clients.map((client) => client.quit().catch(() => undefined)),
    );
  }
}
