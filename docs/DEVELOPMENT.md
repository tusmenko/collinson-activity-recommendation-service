# Development

Everything a developer needs beyond the README's run instructions: toolchain, tests, the stub upstream, the load job, the Compose variants and the known port pitfall.

## Toolchain

Node.js 24 and pnpm 11 (`corepack enable` picks the version from `package.json`). TypeScript is type-checked by `tsc` and emitted by SWC, so relative imports carry no file extension.

```sh
pnpm install
pnpm exec lefthook install   # pre-commit lint-staged and typecheck, commit-msg commitlint, pre-push unit and integration
pnpm run check               # eslint, prettier, tsc, dependency-cruiser layer rules, knip
pnpm test                    # every level below
pnpm run test:cov            # the same with coverage gates
pnpm run start:dev           # watch mode; writes schema.gql on start
```

The coding rules are in [CODING_STANDARDS.md](CODING_STANDARDS.md); the layer rules are enforced by dependency-cruiser from the module table in [D-1](ACTIVITY_RANKING_DESIGN.md#d-1).

## Tests

| Level | Command | Needs |
| --- | --- | --- |
| Unit | `pnpm run test:unit` | nothing |
| Integration | `pnpm run test:integration` | Redis on `localhost:6379`, or `REDIS_URL` |
| Schema snapshot and contract | `pnpm run test:schema` | nothing |
| End-to-end | `pnpm run test:e2e` | Redis; the tests start the stub upstream themselves |

No test calls Open-Meteo: a network guard fails any test that opens a socket outside localhost. Without a local Redis:

```sh
docker run -d --rm -p 6379:6379 redis:7-alpine
```

Coverage gates (lines and branches): `ranking` 90 and 85; `weather` 85 and 80; `location` 85 and 75; `api` 80 and 70; `infra` 70 and 60; every file at least 60 and 50. Test ids follow the [test plan](ACTIVITY_RANKING_TEST_PLAN.md).

## Stub upstream and fixtures

`test/stub-upstream/server.ts` serves recorded Open-Meteo payloads for Biarritz, Chamonix, Dubai, Hintertux, London and Springfield (recorded 2026-10-15; see [test/fixtures/open-meteo/v1/README.md](../test/fixtures/open-meteo/v1/README.md) to record again). Behaviours `ok`, `timeout`, `http500`, `malformed`, `nulls` and `slow` are selected per request by header, path prefix or query. With `STUB_SHIFT_DATES=1` the dates are shifted so the first day is today, which the Compose `demo` profile uses.

## Compose variants

- `docker compose --profile demo up --build`: adds `api-demo` on port 4511 wired through `UPSTREAM_BASE_URL` to the stub upstream, so the service runs without Open-Meteo. Used by the load job; useful during an Open-Meteo outage or to demonstrate the degradation paths by hand.
- `docker compose -f docker-compose.yml -f docker-compose.scale.yml up --build --scale api=2`: two API replicas with queue processors off (ports 4510 and 4511) and one worker from the same image; the Compose version of the Helm worker Deployment.
- `API_PORT` and `API_DEMO_PORT` move the published host ports.

## Load job

`scripts/load.mjs` runs autocannon against the `demo` profile: 50 connections for 10 s on a warm Biarritz query, then one cold Dubai query. It fails on warm p95 of 300 ms or more, any 5xx, any GraphQL error in a sample, or a cold read of 3 s or more. CI runs it on pushes to `main` and nightly. Last runs on 2026-10-15: warm p95 31.8 ms locally and 47.9 ms on the GitHub runner, zero errors, cold 143 ms and 348 ms.

```sh
docker compose --profile demo up -d --build
pnpm run load
docker compose --profile demo down -v
```

## Port pitfall

The service listens on 4510 rather than 3000 because editors and dev servers often hold 3000. If curl still gets an empty reply from a healthy container, run `lsof -nP -iTCP:4510`: Cursor and VS Code forward ports they see in their integrated terminal and take over `127.0.0.1` and `[::1]`, so the request never reaches Docker. Stop the forward in the editor's Ports panel (or set `remote.autoForwardPorts` to false) or run Compose from a plain terminal. Use `http://`, the service does not serve HTTPS.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`: static checks, unit, integration and end-to-end tests with a Redis service, the schema snapshot, coverage gates, the image build, a Compose health check and `helm lint`; the load job runs on `main` and nightly.
