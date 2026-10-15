# Activity Ranking Service

## What it is

A GraphQL service that takes a city or town and scores the next seven days for skiing, surfing, outdoor sightseeing and indoor sightseeing, from Open-Meteo weather and marine forecasts that it stores in Redis. The one query is `activityRankings(city, country, activities)`: `country` narrows an ambiguous name, `activities` selects a subset, and the answer is the resolved location, a status per activity (`APPLICABLE`, `NOT_APPLICABLE`, `UNAVAILABLE`) with a score from 0 to 100 per day, and metadata on how fresh the data is. Scores come from documented threshold rules per activity; the factors behind each score and the reasons behind each status are returned only when selected.

## Prerequisites

- Docker Desktop with Compose v2. Nothing else to run the service: no accounts, no API keys.
- For local development: Node.js 24 and pnpm 11 (`corepack enable` picks the version from `package.json`).
- Ports: 3000 for the service, 3001 for the `demo` profile; Redis listens on 6379 inside Compose only. Images and the Redis volume take under 1 GB.

## Run

```sh
docker compose up --build
```

In a second terminal, check health and ask for Biarritz with the default query (the selection of [test/schema/queries/default.graphql](test/schema/queries/default.graphql)):

```sh
curl localhost:3000/health
curl -s localhost:3000/graphql -H 'content-type: application/json' \
  -d '{"query":"query($city:String!){activityRankings(city:$city){location{id name region country latitude longitude timezone} rankings{activity status days{date score}} meta{fetchedAt stale partial sources{source status fetchedAt} alternatives{id name region country}}}}","variables":{"city":"Biarritz"}}'
```

The first request for a place fetches its forecast (a few hundred milliseconds); repeats within six hours are served from Redis. GraphiQL runs at <http://localhost:3000/graphql> in a browser, with introspection on.

To run without calling Open-Meteo, start the `demo` profile. It adds `api-demo` on port 3001, wired to a stub upstream that serves recorded fixtures (recorded 2026-10-15, dates shifted so the first day is today) for Biarritz, Chamonix, Dubai, Hintertux, London and Springfield:

```sh
docker compose --profile demo up --build
```

Add `details` and `meta.reasons` to the selection to see why. This asks London for surfing and outdoor sightseeing only; each day now carries its factors (signal, value, unit, effect and the threshold's note), and `reasons` names the cause of any non-applicable status:

```sh
curl -s localhost:3001/graphql -H 'content-type: application/json' \
  -d '{"query":"{activityRankings(city:\"London\",activities:[SURFING,OUTDOOR_SIGHTSEEING]){rankings{activity status days{date score details{factors{signal value unit effect note}}}} meta{reasons{activity reason}}}}"}'
```

`details.signals` returns the day's raw weather signals as well; [test/schema/queries/details.graphql](test/schema/queries/details.graphql) has the full selection.

## Develop and test

```sh
pnpm install
pnpm exec lefthook install   # pre-commit lint-staged and typecheck, commit-msg commitlint, pre-push unit and integration
pnpm run check               # eslint, prettier, tsc, dependency-cruiser layer rules, knip
pnpm test                    # every level below
pnpm run test:cov            # the same with coverage gates
```

| Level | Command | Needs |
| --- | --- | --- |
| Unit | `pnpm run test:unit` | nothing |
| Integration | `pnpm run test:integration` | Redis on `localhost:6379`, or `REDIS_URL` |
| Schema snapshot | `pnpm run test:schema` | nothing |
| End-to-end | `pnpm run test:e2e` | Redis; the tests start the stub upstream themselves |

No test calls Open-Meteo: a network guard fails any test that opens a socket outside localhost. Without a local Redis, start one with:

```sh
docker run -d --rm -p 6379:6379 redis:7-alpine
```

Coverage gates (lines and branches): 80 and 75 overall; `ranking` 90 and 85; `weather` 85 and 80; `location` 85 and 75; `api` 80 and 70; `infra` 70 and 60.

The load job runs against the composed `demo` profile: autocannon with 50 connections for 10 s on a warm Biarritz query, then one cold Dubai query. It fails on warm p95 of 300 ms or more, any 5xx, any GraphQL error in a sample, or a cold read of 3 s or more. CI runs it on pushes to `main` and nightly. Last local run (2026-10-15): warm p95 31.8 ms, max 380 ms, 19,265 requests, zero 5xx, cold 143 ms.

```sh
docker compose --profile demo up -d --build
pnpm run load
docker compose --profile demo down -v
```

Fixtures are recorded once and served by the stub; to record them again follow [test/fixtures/open-meteo/v1/README.md](test/fixtures/open-meteo/v1/README.md).

## How it works

**Modules.** Five NestJS modules with one-way imports, enforced by dependency-cruiser: `api` (GraphQL resolvers, Zod argument pipe, error mapping, throttler, complexity limit) calls `ranking`, `location` and `weather` through their public barrels; `ranking` (classifiers, rules, ranking service, events) reads `location` and `weather` types; `weather` (forecast and marine adapters, store, ingest queue) and `location` (geocoding adapter, facts) depend only on `infra` (config, Redis, logging, telemetry, health). Adapters and repositories are the only code that knows a payload shape or a client library ([D-1](docs/ACTIVITY_RANKING_DESIGN.md#d-1)).

**Store.** Redis is the database here, not a cache in front of one. Forecasts are stored one key per location, source and date (`forecast:v1:{locationId}:{source}:{date}`) with a Redis TTL of `RETENTION_TTL` (24 h). Freshness is read from the key's `PTTL`: a key with less than `RETENTION_TTL − FRESHNESS_TTL` left is older than `FRESHNESS_TTL` (6 h) and is refetched before it is served. The last raw upstream payload per location and source is kept for replay and drift checks. Location facts (coordinates, timezone, whether marine data exists) live under keys without TTL; geocode results live for `GEOCODE_TTL`. Redis runs with AOF on a volume, so a restart keeps everything ([D-4](docs/ACTIVITY_RANKING_DESIGN.md#d-4)).

**Refresh on read.** A read that finds a source missing or stale enqueues one BullMQ job per location and source (job id `{locationId}__{source}`), so concurrent readers share one upstream call, and waits for it up to `COLD_READ_BOUND_MS` (4.5 s). Fresh data is then served; stored data is served flagged `stale: true` only when the refetch failed. Outbound calls go through a queue limiter (500 a minute) and a daily guard (9,000), under Open-Meteo's fair-use limits. Nothing is fetched on a schedule ([D-5](docs/ACTIVITY_RANKING_DESIGN.md#d-5)).

**Degradation** ([D-8](docs/ACTIVITY_RANKING_DESIGN.md#d-8)):

| Situation | Behaviour |
| --- | --- |
| Store has the window, data stale, upstream healthy | Await the refetch job up to `COLD_READ_BOUND_MS`, serve fresh, `stale: false` |
| Store has the window, data stale, upstream failing or bound expired | Serve the stored data, `stale: true`, `sources` shows the failure |
| Store missing a source, upstream healthy | Await the job up to `COLD_READ_BOUND_MS`, serve fresh |
| Store missing the forecast source, upstream failing | `UPSTREAM_UNAVAILABLE` with `retryAfterSeconds` and the resolved location |
| Store missing marine only, upstream failing | Serve; surfing `UNAVAILABLE`; `partial: true`; `sources` shows `MARINE: FAILED` |
| Payload fails schema validation | Treated as a failed source; anomaly event; raw payload kept |
| Geocoding fails | `UPSTREAM_UNAVAILABLE` |
| No geocoding match | `NOT_FOUND` naming the input; no forecast call |

**Scoring.** Scores are computed on every read from the stored signals, so a rule change needs no re-ingest. Each activity is a registered classifier that declares the sources it needs and reads its thresholds from a JSON file next to it (`src/ranking/*/*.rules.json`, each threshold with a note). A factor scores 100 in its good band, 0 in its poor band and 50 between; the day is the weighted mean, capped at 30 when a heavy factor is poor, and indoor sightseeing never drops below 40. Skiing is applicable only when the forecast carries snow depth; surfing only where the marine API has data. Ranking events record the rule-set version and each classifier's version; adding an activity is one classifier and one registration ([D-6](docs/ACTIVITY_RANKING_DESIGN.md#d-6)).

**Events and anomalies.** Every ranking writes one JSON log event with the location, fetched-at per source, classifier and rule-set versions, scores and factors; every ingest run writes one with its duration and outcome. Invariants (score range, one score per day of the window, no score on a non-applicable activity) run on each request; a violation logs at warn and increments the OpenTelemetry counter `ranking_anomalies_total{type}`, exported to the console every 60 s or over OTLP ([D-7](docs/ACTIVITY_RANKING_DESIGN.md#d-7)).

The [design document](docs/ACTIVITY_RANKING_DESIGN.md) has the schema, the sequences and the thresholds in full.

## Configuration

Every variable and its default is in [.env.example](.env.example); the service refuses to start on a bad value and names the key. Set them under `environment` of the `api` service in [docker-compose.yml](docker-compose.yml). The five most likely to change:

| Variable | Default | Effect |
| --- | --- | --- |
| `FRESHNESS_TTL` | `6h` | Age at which stored data is refetched before serving |
| `RETENTION_TTL` | `24h` | How long data is kept, so how long an outage can be ridden out on stale data |
| `INBOUND_PER_MINUTE` | `60` | Requests per minute per client before `RATE_LIMITED` |
| `WINDOW_DAYS` | `7` | Days returned per activity (`FETCH_DAYS` must stay above it) |
| `OTEL_EXPORTER` | `console` | `otlp` sends metrics to `OTEL_EXPORTER_OTLP_ENDPOINT` |

## Assumptions

From the [assumptions register](docs/arch/registers.md#assumptions-register); each can be overturned.

- A-2: the reviewer has Docker and a current Node LTS.
- A-3: no authentication.
- A-4: one process with a local store is enough; horizontal scale is the production path.
- A-5: "next 7 days" is today plus six days, in the location's own timezone.
- A-6: scores are rule-based, 0 to 100 per activity per day, with documented thresholds; no machine learning.
- A-7: the output is a score per day per activity; ordering is left to the consumer; no rank field.
- A-8: skiing uses the place's own forecast, with no search for a nearby resort; no snow signal means not applicable.
- A-9: surfing is not applicable where the marine API returns nulls; lakes and lagoons that return waves are scored, low.
- A-10: an ambiguous name resolves to Open-Meteo's first result, preferring an exact name match; alternatives are returned and `country` filters.
- A-12: metric units, English place names.
- A-13: indoor sightseeing is always acceptable and scores higher when outdoor conditions are poor.
- A-14: an unknown place returns a typed `NOT_FOUND` error, not an empty result.
- A-16: every response carries the fetched-at time of its data.
- A-17: one command on a clean clone, under 2 minutes, no key or account.
- A-19: upstream timeout 2 s with one retry; stale data served with a flag on failure; `UPSTREAM_UNAVAILABLE` with a retry hint when nothing is stored; a marine-only failure degrades surfing only.
- A-20: structured logs per upstream call and refresh plus `/health` are enough observability for the exercise.
- A-21: tests cover every level without the live upstream; the load job is a `main` and nightly gate, not a per-push one.
- A-22: a new activity is one classifier module and one registration, with no change elsewhere.
- A-24: interactive use: one reviewer, tens of requests a minute, a handful of places.
- A-25: the process is stateless; one process, one store.
- A-26: open on localhost, no user data.
- A-29: the schema evolves additively, with deprecations for breaking changes.
- A-30: only the latest forecast is kept; classifier outputs are logged as events with versions.
- A-31: place names only, no identity, no client addresses in logs; the HTTP access line carries only method and URL.
- A-33: the forecast store can be rebuilt from upstream; losing it means refetching.
- A-34: one key per location, source and date, expired by Redis; the key is provider-neutral.
- A-35: Docker Compose locally.
- A-36: configuration by environment variables; no secrets exist.
- A-37: zero cost: free API, local store.
- A-38: no availability target; best effort.
- A-39: the lockfile is committed and CI installs from it frozen.
- A-50: skiing applicability is gated on the model's snow depth; glacier cells without model snow (Sölden on 2026-10-14) read as not applicable.
- A-51: a stale or missing read waits for one shared refetch and returns fresh data; `stale` means the refetch failed.

Open questions a product manager would answer, with the answer assumed meanwhile ([open questions log](docs/arch/registers.md#open-questions-log)):

- OQ-2: what makes a day good for each activity? Documented thresholds, to be calibrated (A-6).
- OQ-3: skiing in a city without mountains? Scored from the city's own forecast; not applicable without snow (A-8).
- OQ-4: surfing inland? Not applicable, with the reason (A-9).
- OQ-5: ambiguous names? First result plus alternatives, optional country (A-10).
- OQ-6: how fresh must data be? Six hours, configurable (A-11).
- OQ-7: does "next 7 days" include today? Yes, in local time (A-5).
- OQ-12: is indoor sightseeing ever bad? Never; better when outdoors is worse (A-13).
- OQ-13: what does an unknown name return? A typed not-found error (A-14).

Taken during the overnight build ([OVERNIGHT_NOTES.md](docs/OVERNIGHT_NOTES.md)):

- ON-1: the three Open-Meteo base URLs are environment variables, so the stub upstream can replace them.
- ON-2: agent worklogs under `.claude/worklogs/` stay untracked.
- ON-3: pnpm instead of npm, by the owner's instruction.
- ON-4: one pull request per phase, squash-merged on green CI.
- ON-5: fixtures were recorded live once, with the adapters' exact requests.
- ON-6: `OUTBOUND_LIMIT_WINDOW_MS` is a test knob; the processor runs 16 jobs at once; a fair-use breach is not retried; an invalid payload keeps the stored days.
- ON-7: scoring adds a deal-breaker cap (30) and an indoor floor (40), and widens the skiing poor snow band, after the plain weighted mean failed the golden set.
- ON-8: `NODE_ENV` controls `schema.gql` writing and stack traces; a small Redis throttler storage replaces the package that stops at Nest 11.

## What was cut and why

Nothing was cut. The plan's cut lines (Helm skeleton, load job, OpenTelemetry exporter, `enrich` queue, BullMQ) were all built.

## Production path

- Image pushed to ECR from CI; `helm upgrade` to EKS with the chart in [deploy/helm/activity-ranking](deploy/helm/activity-ranking) (Deployment, Service, HPA, ConfigMap from `.env.example`, probes on `/health`). The chart is linted in CI and has not been deployed.
- Terraform for the VPC, EKS, ElastiCache (Redis OSS with persistence) and ECR.
- Aurora PostgreSQL for location facts once enrichment makes them relational; the forecast store stays on ElastiCache.
- Queue processors move to a worker Deployment from the same image; the API runs with `QUEUE_PROCESSORS_ENABLED=false`.
- Metrics and logs over OTLP to Datadog, with a monitor on `ranking_anomalies_total`.
- k6 replaces autocannon with the same thresholds (warm p95 under 300 ms, zero 5xx, cold under 3 s); a Pact consumer contract on the default query.

## What to verify next

- H-2: whether point-of-interest data (OpenStreetMap Overpass or Wikidata) is good enough to score sightseeing on more than weather.
- H-4: whether a 6-hour freshness TTL loses anything against the models' update cadence; fetch one city hourly for a day and compare.
- A-50: the Sölden glacier false negative; resort elevation as a location fact would shift the forecast by lapse rate.
- Threshold calibration beyond the five golden cities (Chamonix, Biarritz, London, Dubai, Springfield) and the Hintertux pair.

## How this was built

The architecture came first, through the gated process indexed in [docs/ACTIVITY_RANKING_ARCH_PROCESS.md](docs/ACTIVITY_RANKING_ARCH_PROCESS.md), ending in [ADR-0001](docs/adr/0001-pragmatic-option-nestjs-redis-bullmq.md) and the [test plan](docs/ACTIVITY_RANKING_TEST_PLAN.md). The build followed in six test-first phases, one squash commit per phase from pull requests #1 to #6, with the decisions taken overnight in [docs/OVERNIGHT_NOTES.md](docs/OVERNIGHT_NOTES.md).

## Attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
