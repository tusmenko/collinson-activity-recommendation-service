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
// A request farther than this from every recorded place has no fixture, as a typo'd coordinate would.
const MAX_FIXTURE_DISTANCE_DEGREES = 0.5;
// `/stub/<behaviour>/v1/...` lets a client whose base URL is configurable select a behaviour.
const BEHAVIOUR_PREFIX = /^\/stub\/([^/]+)(\/.*)$/;
const MALFORMED_DAILY_FIELD: Readonly<Partial<Record<string, string>>> = {
  '/v1/forecast': 'temperature_2m_max',
  '/v1/marine': 'wave_height_max',
};

export type Behaviour = (typeof BEHAVIOURS)[number];
type Json = Record<string, unknown>;
type RouteBehaviours = Map<string, Behaviour>;

interface StubState {
  readonly options: StubOptions;
  readonly requests: string[];
  readonly routes: RouteBehaviours;
}
type Route = (url: URL) => Promise<Json | undefined>;

export interface StubOptions {
  // Moves the recorded dates so the first day is today in UTC; for the demo profile, never tests.
  readonly shiftDates?: boolean;
}

export interface StubUpstream {
  readonly url: string;
  // Path and query of every request received, in order.
  readonly requests: readonly string[];
  // Default behaviour for one route path such as `/v1/marine`, used when the request selects none; `ok` clears it.
  setBehaviour(route: string, behaviour: Behaviour): void;
  close(): Promise<void>;
}

interface Selected {
  readonly behaviour: Behaviour | undefined;
  readonly pathname: string;
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
    let bestDistance = MAX_FIXTURE_DISTANCE_DEGREES;
    for (const file of await listFixtures(dir)) {
      const body = await readJson(join(dir, file));
      const distance = Math.hypot(
        Number(body?.latitude) - latitude,
        Number(body?.longitude) - longitude,
      );
      if (body !== undefined && distance <= bestDistance) {
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

// One required field gone, so the client's pinned schema rejects the payload.
function malformed(pathname: string, body: Json): Json {
  const field = MALFORMED_DAILY_FIELD[pathname];
  if (field === undefined) {
    return { results: [{ name: 1 }] };
  }
  const daily = isRecord(body.daily) ? body.daily : {};
  return {
    ...body,
    daily: Object.fromEntries(Object.entries(daily).filter(([key]) => key !== field)),
  };
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

// `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`; only the date part moves.
function shiftStamp(stamp: string, offsetMs: number): string {
  const date = new Date(Date.parse(stamp.slice(0, 10)) + offsetMs).toISOString().slice(0, 10);
  return `${date}${stamp.slice(10)}`;
}

function shiftSeries(block: unknown, offsetMs: number): void {
  if (isRecord(block) && Array.isArray(block.time)) {
    block.time = block.time.map((stamp: unknown) =>
      typeof stamp === 'string' ? shiftStamp(stamp, offsetMs) : stamp,
    );
  }
}

function shiftDates(body: Json): Json {
  const first: unknown =
    isRecord(body.daily) && Array.isArray(body.daily.time) ? body.daily.time[0] : undefined;
  if (typeof first !== 'string') {
    return body;
  }
  const today = new Date().toISOString().slice(0, 10);
  const offsetMs = Date.parse(today) - Date.parse(first);
  const copy = structuredClone(body);
  shiftSeries(copy.daily, offsetMs);
  shiftSeries(copy.hourly, offsetMs);
  return copy;
}

function applyBehaviour(behaviour: Behaviour, pathname: string, body: Json): Json {
  switch (behaviour) {
    case 'malformed':
      return malformed(pathname, body);
    case 'nulls':
      return pathname === '/v1/marine' ? nullMarine(body) : body;
    case 'ok':
    case 'slow':
    case 'timeout':
    case 'http500':
      return body;
  }
}

// Precedence: header, then path prefix, then the `stub` query parameter, then the route default.
function select(request: IncomingMessage, url: URL, routes: RouteBehaviours): Selected {
  const header = request.headers['x-stub-behaviour'];
  const [, prefixed, rest] = BEHAVIOUR_PREFIX.exec(url.pathname) ?? [];
  const pathname = rest ?? url.pathname;
  const requested =
    (typeof header === 'string' ? header : (prefixed ?? url.searchParams.get('stub'))) ??
    routes.get(pathname) ??
    'ok';
  return { behaviour: BEHAVIOURS.find((behaviour) => behaviour === requested), pathname };
}

function send(response: ServerResponse, status: number, body: Json): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

async function respond(
  request: IncomingMessage,
  response: ServerResponse,
  signal: AbortSignal,
  { options, routes }: StubState,
): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://stub.local');
  const { behaviour, pathname } = select(request, url, routes);
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
  const body = await ROUTES[pathname]?.(url);
  if (body === undefined) {
    send(response, 404, { error: true, reason: `no fixture for ${pathname}${url.search}` });
    return;
  }
  const dated = options.shiftDates === true ? shiftDates(body) : body;
  send(response, 200, applyBehaviour(behaviour, pathname, dated));
}

function handler(state: StubState) {
  return (request: IncomingMessage, response: ServerResponse): void => {
    state.requests.push(request.url ?? '/');
    // Aborts a held `timeout` response when the client gives up or the server closes.
    const controller = new AbortController();
    response.on('close', () => {
      controller.abort();
    });
    respond(request, response, controller.signal, state).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        send(response, 500, {
          error: true,
          reason: error instanceof Error ? error.message : 'stub',
        });
      }
    });
  };
}

export async function startStubUpstream(
  port = 0,
  options: StubOptions = {},
): Promise<StubUpstream> {
  const requests: string[] = [];
  const routes: RouteBehaviours = new Map();
  const server = createServer(handler({ options, requests, routes }));
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const { port: boundPort } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${String(boundPort)}`,
    requests,
    setBehaviour: (route, behaviour) => {
      if (behaviour === 'ok') {
        routes.delete(route);
      } else {
        routes.set(route, behaviour);
      }
    },
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
  const stub = await startStubUpstream(Number(process.argv[2] ?? DEFAULT_CLI_PORT), {
    shiftDates: process.env.STUB_SHIFT_DATES === '1',
  });
  process.stdout.write(`stub upstream listening on ${stub.url}\n`);
  process.once('SIGTERM', () => void stub.close());
}
