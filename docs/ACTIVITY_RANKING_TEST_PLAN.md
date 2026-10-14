# Activity Ranking Service — Test Plan

Design-level artifact. Implements [NFR-6](arch/02-requirements.md#nfr-6) and the validation matrix in [Step 5](arch/06-plan.md); the mechanisms it tests are in the [design document](ACTIVITY_RANKING_DESIGN.md). It evolves with every pull request: a new requirement gets a matrix row before code is written, and a merged phase ticks its rows.

## Strategy

- Testing pyramid, written test-first: unit at the base, integration against a real Redis, schema and contract, end-to-end over HTTP with a stub upstream, a load job, and an operability job. Nothing in any level calls Open-Meteo; fixtures are recorded once.
- Every quality attribute scenario and every requirement has at least one named test case; the matrix below is the contract.
- Gates: unit, integration, schema, end-to-end and coverage gate every pull request; load and operability gate `main`; the performance smoke numbers close [H-5](arch/registers.md#h-5).

## Levels and tooling

| Level | Tool | Runs against | Gate |
| --- | --- | --- | --- |
| Static | eslint, prettier, `tsc --noEmit` | source | pre-commit, CI |
| Unit | Vitest | pure modules, fixture `DaySignals` | pre-push, CI |
| Integration | Vitest | Redis service container, BullMQ processors in-process, stubbed adapters | pre-push, CI |
| Schema and contract | Vitest snapshot; query fixtures | generated `schema.gql`; default and details queries | CI |
| End-to-end | Vitest, native `fetch` | the Nest app on `app.listen(0)` with the stub upstream | CI |
| Load | autocannon with thresholds | composed service plus stub upstream | CI on `main`, nightly |
| Operability | CI job | built image via `docker compose up`, `/health` | CI on `main` |
| Production path, described only | k6 with the same thresholds; Pact consumer contract | staging | not in the exercise |

## Coverage targets

Measured by Vitest coverage (v8). Gating thresholds fail CI; targets are the aim.

| Module | Lines gate | Branches gate | Target | Why |
| --- | --- | --- | --- | --- |
| `ranking` (classifiers, rules, ranking service, invariants) | 90 | 85 | 95 | The product logic; every threshold branch is a scenario |
| `weather` (adapters, repository, ingest, queues) | 85 | 80 | 90 | Failure and staleness branches |
| `location` | 85 | 75 | 90 | Name resolution rules |
| `api` | 80 | 70 | 85 | Resolvers, pipe, filter, complexity |
| `infra` | 70 | 60 | 80 | Config, logging, health |
| Overall | 80 | 75 | 88 | |

## Traceability matrix

Test case ids: U unit, I integration, S schema, E end-to-end, L load, O operability. Each case is a file or describe block named after its id.

| Requirement or scenario | Test cases | Level | Phase |
| --- | --- | --- | --- |
| [FR-1](arch/02-requirements.md#fr-1) accept a place name | U-LOC-1 resolve by name; E-API-1 query by city | unit, end-to-end | 1, 4 |
| [FR-2](arch/02-requirements.md#fr-2) seven days | U-RANK-1 exactly `WINDOW_DAYS` dated scores; I-STORE-3 window change refetches missing dates | unit, integration | 2, 3 |
| [FR-3](arch/02-requirements.md#fr-3) four activities | U-RANK-2 registry exposes the four; S-SCHEMA-1 enum snapshot | unit, schema | 3, 4 |
| [FR-4](arch/02-requirements.md#fr-4) score per day per activity | U-RANK-3 scores within 0 to 100 in date order | unit | 3 |
| [DF-1](arch/02-requirements.md#df-1) ambiguity | U-LOC-2 exact-name preference (Victoria versus Vitória); U-LOC-3 Springfield gives Missouri plus four alternatives; E-API-2 alternatives in `meta` | unit, end-to-end | 1, 4 |
| [DF-2](arch/02-requirements.md#df-2) unknown name | U-LOC-4 no results gives `NOT_FOUND`; E-API-3 error code and no forecast call | unit, end-to-end | 1, 4 |
| [DF-3](arch/02-requirements.md#df-3) not applicable | U-SURF-1 marine nulls give `NOT_APPLICABLE` with reason; U-SKI-1 snow depth under 5 cm every day gives `NOT_APPLICABLE` | unit | 3 |
| [DF-4](arch/02-requirements.md#df-4) factors on selection | E-API-4 default query has no `details`; E-API-5 details query returns factors and signals; U-EVENT-1 event always carries factors | end-to-end, unit | 3, 4 |
| [DF-5](arch/02-requirements.md#df-5) data age | E-API-6 `meta.fetchedAt` and `stale` present | end-to-end | 4 |
| [DF-6](arch/02-requirements.md#df-6) per-source failure | I-INGEST-5 marine fails: surfing `UNAVAILABLE`, `partial: true`, forecast persisted; I-INGEST-6 forecast fails with empty store: `UPSTREAM_UNAVAILABLE` under 4.5 s with location | integration | 2 |
| [DF-7](arch/02-requirements.md#df-7) partial requests | I-INGEST-7 indoor-only request fetches forecast only; later surfing request fetches marine only | integration | 2 |
| [NFR-1](arch/02-requirements.md#nfr-1) timeliness | I-STORE-1 `PTTL` below threshold triggers refetch and serves fresh; I-STORE-2 fresh key skips upstream | integration | 2 |
| [NFR-2](arch/02-requirements.md#nfr-2) deployability | O-COMPOSE-1 compose health within 120 s on the built image | operability | 0 |
| [NFR-3](arch/02-requirements.md#nfr-3) performance | E-API-7 warm read makes zero adapter calls; E-API-8 cold read makes at most three; L-WARM-1 p95 under 300 ms; L-COLD-1 one cold read under 3 s against the stub | end-to-end, load | 4, 5 |
| [NFR-4](arch/02-requirements.md#nfr-4) availability | I-INGEST-3 timeout then retry once; I-INGEST-4 stored data served `stale: true` when refetch fails; I-INGEST-6 as above | integration | 2 |
| [NFR-5](arch/02-requirements.md#nfr-5) fault detection | U-INFRA-1 health reports Redis down; I-INGEST-8 every run emits an event with duration and outcome; I-INGEST-9 `ingest:last-error` written on failure | unit, integration | 0, 2 |
| [NFR-6](arch/02-requirements.md#nfr-6) testability | the pipeline itself: all levels run under 5 minutes, zero live calls (asserted by a network guard in the test setup) | CI | 0 |
| [NFR-7](arch/02-requirements.md#nfr-7) extensibility | U-RANK-4 a fake fifth activity registers and is ranked; S-SCHEMA-2 enum regenerates with it; a diff check that no other source file changed | unit, schema | 3, 4 |
| [NFR-8](arch/02-requirements.md#nfr-8) LLM-ops | not built; U-RANK-5 asserts the classifier contract accepts an async classifier | unit | 3 |
| [NFR-9](arch/02-requirements.md#nfr-9) upstream access | I-QUEUE-1 five concurrent adds run once; I-QUEUE-2 limiter stretches 20 jobs past 3 s; I-QUEUE-3 daily counter blocks above `OUTBOUND_PER_DAY`; E-API-9 six `rankings` selections give `QUERY_TOO_COMPLEX` | integration, end-to-end | 2, 4 |
| [NFR-10](arch/02-requirements.md#nfr-10) deployability | CI workflow green including image build and `helm lint`; O-COMPOSE-1 | CI | 0, 5 |
| [NFR-11](arch/02-requirements.md#nfr-11) provider neutrality | U-ADAPT-1 forecast payload validates against the pinned schema; U-ADAPT-2 a payload missing a field is reported as a failed source, not thrown; U-ADAPT-3 marine nulls normalise to absent signals; U-ADAPT-4 `snow_depth` hourly reduces to a daily maximum; U-ADAPT-5 a second fake adapter satisfies the interface | unit | 1 |
| [NFR-12](arch/02-requirements.md#nfr-12) security | U-API-1 empty, overlong and non-letter city give `BAD_USER_INPUT`; E-API-10 throttle exceeded gives `RATE_LIMITED`; E-API-9 complexity | unit, end-to-end | 4 |
| [NFR-13](arch/02-requirements.md#nfr-13) traceability | U-EVENT-1 event carries provider, fetched-at, classifier id and version, rule-set version; U-EVENT-2 invariant violations log at warn and increment `ranking_anomalies_total{type}`; U-EVENT-3 `marineDataAvailable` change emits an event | unit | 3 |
| [QAS-1](arch/02-requirements.md#qas-1) to [QAS-11](arch/02-requirements.md#qas-11) | mapped in the Step 5 validation matrix to the cases above | | |

## Golden set and fixtures

Recorded once from Open-Meteo (live on 2026-10-14, archive for past days), stored under `test/fixtures/<provider>/<schemaVersion>/`, and served by the stub upstream.

| Fixture | Source | Expected outcome in U-RANK golden tests |
| --- | --- | --- |
| Chamonix, 2026-01-10 to 16 (archive) | forecast | skiing APPLICABLE, 10 January good (12.5 cm snowfall, tmax −2) |
| Chamonix, 2026-10-14 (live) | forecast | skiing NOT_APPLICABLE (snow depth 0); outdoor sightseeing good on dry days |
| Hintertux at 3250 m, 2026-10-14 (live, `elevation`) | forecast | skiing APPLICABLE (snow depth 39 cm) |
| Biarritz, 2026-10-14 (live) | forecast, marine | surfing APPLICABLE and good (1.2 to 2.0 m, 9 to 14 s) |
| Dubai, 2026-10-14 (live) | forecast, marine | surfing poor (period under 4 s); indoor over outdoor (tmax 34 to 38) |
| London, 2026-10-14 (live) | forecast, marine nulls | surfing NOT_APPLICABLE; indoor on rain days |
| Springfield Missouri, 2026-10-14 (live) | forecast, marine nulls | indoor on day 1 (83 mm); outdoor good days 4 to 7 |
| Geocoding: Springfield, Victoria, Newcastle, Xyzzyqq | geocoding | five matches; fuzzy first hit; no results |

Stub upstream behaviours, selected per request by a header or query flag: `ok`, `timeout` (exceeds `UPSTREAM_TIMEOUT_MS`), `http500`, `malformed` (field missing), `nulls` (marine inland), `slow` (under the timeout, for load mixes).

## Non-functional verification

| Attribute | How it is verified | Threshold |
| --- | --- | --- |
| Performance | L-WARM-1, L-COLD-1 with autocannon in CI; the same scripts for k6 on the production path | warm p95 under 300 ms at 50 connections; zero 5xx; cold read under 3 s |
| Availability | Fault injection through the stub (timeout, http500, malformed) in I-INGEST-3 to 6 | every failure path returns a typed outcome within its bound |
| Security | U-API-1, E-API-9, E-API-10; dependency audit in CI | malformed input never reaches the store or upstream |
| Deployability | O-COMPOSE-1; `helm lint` | health within 120 s on a clean image |
| Fault detection and traceability | I-INGEST-8, U-EVENT-1 to 3 | every run and ranking emits a complete event |
| Modifiability | U-RANK-4, S-SCHEMA-2, U-ADAPT-5 | a new activity or adapter touches only its own files |
| Upstream fair use | I-QUEUE-1 to 3 | limiter and counter hold under concurrency |

## Phase entry and exit

The harness (configs, Redis service, end-to-end bootstrap, stub upstream, fixture loader, network guard, coverage gates, hooks, CI jobs) is built in phase 0 before any behaviour, so every later phase begins with its red tests. A phase may start when the previous phase's rows are ticked. A phase exits when every row assigned to it has a passing test, coverage gates hold, and the pull request is green. The matrix is updated in the same pull request as the code it covers.

## Out of scope for the exercise

The LLM classifier path, enrichment jobs, the Helm deployment itself, Pact contracts and k6 runs are described, not executed. Each is named in the README under the production path.
