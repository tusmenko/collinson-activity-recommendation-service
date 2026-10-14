// Zero-dependency stand-in for Open-Meteo, run directly by Node's type stripping: erasable syntax only.
import { readdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures/open-meteo/v1/', import.meta.url));
const BEHAVIOURS = ['ok', 'timeout', 'http500', 'malformed', 'nulls', 'slow'] as const;
// Longer than any UPSTREAM_TIMEOUT_MS a test uses, so the client always gives up first.
const TIMEOUT_HOLD_MS = 5_000;
// Well under the default upstream timeout, for load mixes that must still succeed.
const SLOW_DELAY_MS = 300;
const DEFAULT_CLI_PORT = 8080;

type Behaviour = (typeof BEHAVIOURS)[number];
type Json = Record<string, unknown>;
type Route = (url: URL) => Promise<Json | undefined>;

export interface StubUpstream {
  readonly url: string;
  close(): Promise<void>;
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readJson(path: string): Promise<Json | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
    return isRecord(parsed) ? parsed : undefined;
  } catch (error) {
    if (isMissing(error)) {
      return undefined;
    }
    throw error;
  }
}

function slug(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Open-Meteo answers an unknown name with 200 and no `results` key, not with 404.
async function geocoding(url: URL): Promise<Json> {
  const name = url.searchParams.get('name') ?? '';
  const fixture = await readJson(join(FIXTURES_DIR, 'geocoding', `${slug(name)}.json`));
  return fixture ?? { generationtime_ms: 0.1 };
}

async function listFixtures(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((file) => file.endsWith('.json'));
  } catch (error) {
    if (isMissing(error)) {
      return [];
    }
    throw error;
  }
}

function nearestFixture(kind: 'forecast' | 'marine'): Route {
  return async (url) => {
    const latitude = Number(url.searchParams.get('latitude'));
    const longitude = Number(url.searchParams.get('longitude'));
    const dir = join(FIXTURES_DIR, kind);
    let best: Json | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const file of await listFixtures(dir)) {
      const body = await readJson(join(dir, file));
      const distance =
        (Number(body?.latitude) - latitude) ** 2 + (Number(body?.longitude) - longitude) ** 2;
      if (body !== undefined && distance < bestDistance) {
        best = body;
        bestDistance = distance;
      }
    }
    return best;
  };
}

const ROUTES: Readonly<Partial<Record<string, Route>>> = {
  '/v1/search': geocoding,
  '/v1/forecast': nearestFixture('forecast'),
  '/v1/marine': nearestFixture('marine'),
};

function dropRequiredField(body: Json): Json {
  const copy = structuredClone(body);
  delete copy.daily;
  const results = copy.results;
  if (Array.isArray(results)) {
    copy.results = results.map((result: unknown) => {
      const { latitude: _dropped, ...rest } = isRecord(result) ? result : {};
      return rest;
    });
  }
  return copy;
}

function nullSeries(block: unknown): void {
  if (!isRecord(block)) {
    return;
  }
  for (const [key, values] of Object.entries(block)) {
    if (key !== 'time' && Array.isArray(values)) {
      block[key] = values.map(() => null);
    }
  }
}

// Inland points: Open-Meteo marine returns the time axis with every value null.
function nullMarine(body: Json): Json {
  const copy = structuredClone(body);
  nullSeries(copy.daily);
  nullSeries(copy.hourly);
  return copy;
}

function applyBehaviour(behaviour: Behaviour, pathname: string, body: Json): Json {
  switch (behaviour) {
    case 'malformed':
      return dropRequiredField(body);
    case 'nulls':
      return pathname === '/v1/marine' ? nullMarine(body) : body;
    case 'ok':
    case 'slow':
    case 'timeout':
    case 'http500':
      return body;
  }
}

function behaviourOf(request: IncomingMessage, url: URL): Behaviour | undefined {
  const header = request.headers['x-stub-behaviour'];
  const requested = (typeof header === 'string' ? header : url.searchParams.get('stub')) ?? 'ok';
  return BEHAVIOURS.find((behaviour) => behaviour === requested);
}

function send(response: ServerResponse, status: number, body: Json): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function respond(
  request: IncomingMessage,
  response: ServerResponse,
  signal: AbortSignal,
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://stub.local');
  const behaviour = behaviourOf(request, url);
  if (behaviour === undefined) {
    send(response, 400, { error: true, reason: 'unknown stub behaviour' });
    return;
  }
  if (behaviour === 'http500') {
    send(response, 500, { error: true, reason: 'stub http500' });
    return;
  }
  if (behaviour === 'timeout' || behaviour === 'slow') {
    await delay(behaviour === 'timeout' ? TIMEOUT_HOLD_MS : SLOW_DELAY_MS, undefined, { signal });
  }
  const body = await ROUTES[url.pathname]?.(url);
  if (body === undefined) {
    send(response, 404, { error: true, reason: `no fixture for ${url.pathname}${url.search}` });
    return;
  }
  send(response, 200, applyBehaviour(behaviour, url.pathname, body));
}

function handle(request: IncomingMessage, response: ServerResponse): void {
  // Aborts a held `timeout` response when the client gives up or the server closes.
  const controller = new AbortController();
  response.on('close', () => {
    controller.abort();
  });
  respond(request, response, controller.signal).catch((error: unknown) => {
    if (!controller.signal.aborted) {
      send(response, 500, { error: true, reason: error instanceof Error ? error.message : 'stub' });
    }
  });
}

export async function startStubUpstream(port = 0): Promise<StubUpstream> {
  const server = createServer(handle);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const { port: boundPort } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${String(boundPort)}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
        server.closeAllConnections();
      }),
  };
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  const stub = await startStubUpstream(Number(process.argv[2] ?? DEFAULT_CLI_PORT));
  process.stdout.write(`stub upstream listening on ${stub.url}\n`);
  process.once('SIGTERM', () => void stub.close());
}
