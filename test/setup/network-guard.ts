import net from 'node:net';

// Every client (http, undici fetch, tls, ioredis) ends in net.Socket#connect, so one patch covers all.
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

type ConnectArgs = Parameters<net.Socket['connect']>;

// tls.connect always carries a `path` key, usually undefined; only a string means an IPC socket.
function hostFromOptions(options: object): string | undefined {
  if ('path' in options && typeof options.path === 'string') {
    return undefined;
  }
  return 'host' in options && typeof options.host === 'string' ? options.host : 'localhost';
}

function isPort(value: unknown): boolean {
  return typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
}

function targetHost(args: readonly unknown[]): string | undefined {
  const [first, second] = args;
  // net.connect() and the http agents pass their already-normalised [options, callback] pair.
  if (Array.isArray(first)) {
    return targetHost(first);
  }
  if (typeof first === 'object' && first !== null) {
    return hostFromOptions(first);
  }
  if (isPort(first)) {
    return typeof second === 'string' ? second : 'localhost';
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/unbound-method -- re-invoked below with the socket as `this` via apply
const originalConnect = net.Socket.prototype.connect;

net.Socket.prototype.connect = function guardedConnect(this: net.Socket, ...args: ConnectArgs) {
  const host = targetHost(args);
  if (host !== undefined && !ALLOWED_HOSTS.has(host)) {
    throw new Error(`Network guard: outbound connection to ${host} blocked in tests`);
  }
  return originalConnect.apply(this, args);
} as net.Socket['connect'];
