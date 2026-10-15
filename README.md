# Activity Ranking Service

A GraphQL service that takes a city or town and scores the next seven days for skiing, surfing, outdoor sightseeing and indoor sightseeing. Weather and marine forecasts come from Open-Meteo and are stored in Redis; the API never calls Open-Meteo for data it already holds and refreshes it when it is older than six hours.

## Prerequisites

- Docker Desktop with Compose v2. No accounts, no API keys.
- Port 4510 free on the host (change it with `API_PORT=<port> docker compose up --build`).
- For development only: Node.js 24 and pnpm 11; see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Run

```sh
docker compose up --build
```

Then, in a second terminal:

```sh
curl http://localhost:4510/health/ready
curl -s http://localhost:4510/graphql -H 'content-type: application/json' \
  -d '{"query":"query($city:String!){activityRankings(city:$city){location{name region country} rankings{activity status days{date score}} meta{fetchedAt stale partial alternatives{name country}}}}","variables":{"city":"Biarritz"}}'
```

The first request for a place fetches its forecast from Open-Meteo (a few hundred milliseconds); repeats within six hours are served from Redis. GraphiQL at <http://localhost:4510/graphql> opens with three example tabs: the default answer for Biarritz, the per-day details for London, and Springfield narrowed to the US with its alternatives ranked. The service speaks plain HTTP.

## The API

One query: `activityRankings(city: String!, country: String, region: String, activities: [Activity!])`. The answer holds the resolved location (with up to four alternatives for an ambiguous name), one entry per activity with a status and a score from 0 to 100 for each of the seven days, and `meta` with the data's fetched-at time and freshness flags.

- Statuses: `APPLICABLE` (scored), `NOT_APPLICABLE` (the place cannot host the activity, for example skiing below 800 m or surfing inland; `meta.reasons` says why), `NO_CONDITIONS` (the place can host it but no day this week suits it, for example skiing in Chamonix in October with no snow on the ground; `meta.reasons` says why), `UNAVAILABLE` (the marine source failed; `meta.partial` is true).
- `days.details` returns the factors behind a score (signal, value, unit, effect and the threshold note) and the raw signals; it is computed on every request and serialised only when selected.
- Errors are typed: `BAD_USER_INPUT`, `NOT_FOUND`, `UPSTREAM_UNAVAILABLE` with `retryAfterSeconds`, `RATE_LIMITED`, `QUERY_TOO_COMPLEX`. Anything else is `INTERNAL_SERVER_ERROR`, with the detail logged and not returned.

The schema is committed as [schema.gql](schema.gql).

## How it works

- **Store.** Redis holds one key per location, source and date with a 24 h TTL; a key whose remaining TTL shows it is older than 6 h is refreshed before it is served. Location facts (coordinates, timezone, whether marine data exists) have no TTL. Redis runs with append-only persistence on a volume. With Redis away the service still starts (readiness reports it) and still stops on SIGTERM: boot and shutdown wait at most 5 s per connection.
- **Refresh on read.** A missing or stale source enqueues one BullMQ job per location and source; concurrent readers wait on the same job (at most 4.5 s), so one expiry costs one upstream call. Stored data is served flagged `stale` only when the refetch failed; with nothing stored and the forecast failing, the answer is `UPSTREAM_UNAVAILABLE`. Outbound calls are limited to 500 a minute and 9,000 a day, under Open-Meteo's fair use.
- **Scoring.** Each activity is a classifier with its thresholds in a JSON file next to it, every threshold with a note. A factor scores 100 in its good band, 0 in its poor band, 50 between; the day is the weighted mean, capped at 30 when a heavy factor is poor; indoor sightseeing never drops below 40 and reaches at least 60 when one heavy signal (heat, cold or heavy rain) pushes people indoors. Scores are computed on read, so a rule change needs no re-ingest. Adding an activity is one folder and one list entry.
- **Traceability.** Every ranking writes one structured log event with the data's fetched-at time, the classifier and rule-set versions, scores and factors; invariant violations increment `ranking_anomalies_total{type}`.

The [design document](docs/ACTIVITY_RANKING_DESIGN.md) has the schema, the store model, the sequences, the degradation rules and the thresholds; [docs/ACTIVITY_RANKING_LAYERS.md](docs/ACTIVITY_RANKING_LAYERS.md) has the layer and flow diagrams.

## Configuration

Every variable and its default is in [.env.example](.env.example); the service refuses to start on a bad value and names the key. The ones most likely to change: `FRESHNESS_TTL` (6h), `RETENTION_TTL` (24h), `WINDOW_DAYS` (7), `INBOUND_PER_MINUTE` (60).

## Assumptions

Where a product manager would normally decide, the assumption taken is listed here; the register's [product assumptions](docs/arch/registers.md#product-assumptions) have the full set with rationale and status.

- "Next 7 days" is today plus six days, in the place's own timezone.
- Scores are rule-based from weather and geo data alone, 0 to 100 per activity per day, with documented thresholds calibrated on five known cities; no machine learning, no points-of-interest data. Ordering is left to the consumer; there is no rank field.
- Skiing uses the place's own forecast: not applicable below 800 m elevation, and no conditions when the window has no snow depth of 5 cm on any day; no search for a nearby resort. Surfing is not applicable where the marine API has no data; lakes and lagoons that return waves are scored, low. Indoor sightseeing is always at least acceptable and scores higher when outdoor conditions are poor.
- An ambiguous name resolves to Open-Meteo's first result, which is population-weighted; alternatives are returned, and `country` and `region` (a state or province, such as `Springfield` with `Illinois`) narrow it. An unknown name is a typed `NOT_FOUND` error.
- Data older than six hours is refreshed before it is served, matching the slowest Open-Meteo model refresh. On upstream failure, stored data is served flagged stale; with nothing stored, a typed error with a retry hint. A marine-only failure degrades surfing only.
- A failure while ranking one alternative nulls only that alternative's `rankings` and is reported in `errors`; the primary answer survives.
- Metric units, English place names, no authentication, one process with one Redis for the exercise; horizontal scale is the production path.
- Per-client rate limiting keys on the client IP and assumes the service is exposed directly; behind a proxy or ingress, set `TRUST_PROXY` (the Helm chart sets it to `1`).

Open product questions, each with the assumption in force: what makes a day good for each activity (the thresholds; the main one to revisit), and whether indoor sightseeing should ever score low on a perfect outdoor day.

## What was cut and why

- The `enrich` queue registration was removed in the review pass: nothing enqueued to it and it held an idle Redis connection. The `ingest` queue shows the pattern an enrichment queue would follow.

## Production path

Image to ECR from CI; the Helm chart in [deploy/helm/activity-ranking](deploy/helm/activity-ranking) (Deployment, Service, HPA, ConfigMap, liveness and readiness probes, optional worker Deployment for the queue processors) to EKS; Terraform for VPC, EKS, ElastiCache and ECR; Aurora for location facts once enrichment makes them relational; metrics over OTLP to Datadog. The chart is linted in CI and has not been deployed.

## What to verify next

- Threshold calibration beyond the five golden cities (Chamonix, Biarritz, London, Dubai, Springfield).
- Whether point-of-interest data (OpenStreetMap, Wikidata) improves sightseeing scores beyond weather.
- Whether a 6 h freshness TTL loses anything against the models' update cadence.
- The glacier false negative: Open-Meteo carries no model snow on some glacier cells (Sölden), so an open glacier reads as not applicable.

## How this was built

Architecture first, through the gated process in [docs/ACTIVITY_RANKING_ARCH_PROCESS.md](docs/ACTIVITY_RANKING_ARCH_PROCESS.md), ending in the [ADR log](docs/adr/README.md) and the [test plan](docs/ACTIVITY_RANKING_TEST_PLAN.md); then six test-first phases as pull requests #1 to #6, four small follow-ups (#7 to #10: wrap-up notes, the 4510 port, two README fixes), and an owner review pass (#11). The review pass branched after #10 and was squashed onto `main`, so #7 to #10 show in the pull request list but not as separate commits on `main`. The implementation decisions taken along the way are in [D-12](docs/ACTIVITY_RANKING_DESIGN.md#d-12) of the design document; open questions and the progress log are in [docs/OVERNIGHT_NOTES.md](docs/OVERNIGHT_NOTES.md).

### AI use

The brief asks for AI to be used, and it was, in three Claude Code sessions, each with a different degree of autonomy:

1. **Architecture session**, steered step by step. A self-written solution-architect agent walks a simplified SEI process: stakeholders, requirements and quality attribute scenarios, architecturally significant requirements, options and trade-offs, recommendation, ADR, implementation plan. Every gate in `docs/arch/` is its output; every decision at a gate was mine.
2. **Autonomous implementation session**, run unattended overnight. It built phases 0 to 5 from the handoff and the test plan, test-first, one pull request per phase merged on green CI, and logged the questions it could not answer in [docs/OVERNIGHT_NOTES.md](docs/OVERNIGHT_NOTES.md).
3. **Review and refactoring sessions**, with me steering: the owner review pass (#11), then a pre-submission review that audited the code against the design and the docs against the code, and the fixes that followed.

Claude Fable orchestrated and reviewed; Claude Opus did most of the editing. The conventions the sessions followed are in [CLAUDE.md](CLAUDE.md).

## Attribution

Weather data by [Open-Meteo.com](https://open-meteo.com/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
