import type { ConnectionOptions } from 'bullmq';

const DEFAULT_PORT = 6379;

// BullMQ opens its own clients (a blocking one per worker and per QueueEvents, with
// maxRetriesPerRequest: null), so it gets connection options rather than the shared client.
// The prefix is the BullMQ key namespace; tests give each harness its own.
export class QueueConnection {
  readonly connection: ConnectionOptions;

  constructor(
    redisUrl: string,
    readonly prefix = 'bull',
  ) {
    const url = new URL(redisUrl);
    this.connection = {
      host: url.hostname,
      port: url.port === '' ? DEFAULT_PORT : Number(url.port),
      db: Number(url.pathname.slice(1)),
      ...(url.username === '' ? {} : { username: decodeURIComponent(url.username) }),
      ...(url.password === '' ? {} : { password: decodeURIComponent(url.password) }),
      ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }
}
