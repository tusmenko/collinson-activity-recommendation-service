# Activity Ranking Service

A GraphQL service that takes a place name and ranks how good the next seven days are for skiing, surfing, outdoor sightseeing and indoor sightseeing there, using Open-Meteo weather and marine forecasts. It is built with NestJS on Node.js and keeps its data in Redis; the design and the decisions behind it are in [docs/](docs/IMPLEMENTATION_HANDOFF.md).

## Prerequisites

- Docker Desktop, to run the service.
- Node.js 24 and pnpm 11 (`corepack enable`), for local development.

## Run

```sh
docker compose up --build
curl localhost:3000/health
```

`docker compose --profile demo up --build` also starts the service against the stub upstream on `localhost:3001`, so it runs without calling Open-Meteo.

## Develop

```sh
pnpm install
pnpm exec lefthook install   # git hooks: lint-staged and typecheck, commitlint, tests on push
pnpm run check               # lint, format, typecheck, dependency rules, unused code
pnpm test                    # every test level; integration and end-to-end need Redis on localhost:6379
```

Every configuration variable and its default is listed in [.env.example](.env.example).

## Status

Phase 0: scaffold, testing harness, hooks, CI and Compose. No ranking behaviour yet.

## Cuts

None yet.
