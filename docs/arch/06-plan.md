# Step 5 — Detailed Design + Tasking

Part of the [architecture process](../ACTIVITY_RANKING_ARCH_PROCESS.md). Implements [ADR-0001](../adr/0001-pragmatic-option-nestjs-redis-bullmq.md) through the [design document](../ACTIVITY_RANKING_DESIGN.md) (D-n). Greenfield: everything is built new; nothing existing changes. Six phases, each leaving a working, committed service; cut lines in order at the end. Time estimates assume one developer, Node 24, Docker running, 31 GB free.

## Phases

| Phase | Builds | Design | Acceptance | Risks and mitigations | Estimate |
| --- | --- | --- | --- | --- | --- |
| 0 Scaffold and testing harness | Nest 12 scaffold (ESM, Vitest); five module stubs; Zod `EnvSchema` with the two refinements; pino; Terminus `/health`; Dockerfile; Compose with `api` and `redis` (AOF, volume). The harness, before any behaviour: Vitest unit and integration configs with the Redis service; an end-to-end bootstrap helper (`createTestApp()` with stubbed adapters on `app.listen(0)`); the stub upstream container with an empty fixture set and the fault behaviours; the fixture loader; a network guard failing any test that opens a socket outside localhost; coverage gates per module; eslint (typescript-eslint strict, size and complexity limits, sonarjs, `no-process-env`), prettier, dependency-cruiser layer rules and knip from the [coding standards](../CODING_STANDARDS.md); lefthook hooks (pre-commit lint-staged and `tsc --noEmit`, commit-msg commitlint, pre-push unit and integration); GitHub Actions with every job wired (frozen install, lint, type check, unit, integration with a redis service, schema snapshot, end-to-end, coverage, image build, compose health check, `helm lint`, load job skeleton), trivially green where no code exists yet; branch protection on `main`; `.env.example`; README stub with the run command | [D-1](../ACTIVITY_RANKING_DESIGN.md#d-1), [D-2](../ACTIVITY_RANKING_DESIGN.md#d-2), [D-11](../ACTIVITY_RANKING_DESIGN.md#d-11) | `docker compose up` answers `/health` 200 on a clean clone in under 2 minutes ([QAS-8](02-requirements.md#qas-8)); one sample test at every level runs green in CI through the harness, including the network guard tripping on a deliberate outbound call; app refuses to start on a bad env value naming the key | [R-10](04-options.md#r-10) boilerplate: CLI generators, no custom decorators. [R-1](04-options.md#r-1): stop at 40 minutes and move on with whatever CI step is missing noted | 45 min |
| 1 Location and provider adapters | Geocoding adapter (count 5, exact-name preference, `NOT_FOUND` on no results); `FactsRepository` on `location:v1` and `geocode:v1`; Forecast and Marine adapters with pinned Zod payload schemas, `FETCH_DAYS` days, hourly `snow_depth` reduced to a daily maximum, normalised to `DaySignals`; recorded fixtures loaded into the phase 0 stub upstream: live today for the five golden cities, archive for Chamonix 10 January 2026, Hintertux and Chamonix snow depth; a `demo` Compose profile that runs the service against the stub | [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4) facts, [D-5](../ACTIVITY_RANKING_DESIGN.md#d-5) steps | Adapter unit tests on fixtures; "Springfield" resolves to Missouri with four alternatives ([QAS-5](02-requirements.md#qas-5)); "Xyzzyqq" gives `NOT_FOUND` with no forecast call ([QAS-6](02-requirements.md#qas-6)); a payload with a missing field fails validation and is reported, not thrown ([R-9](04-options.md#r-9)) | [R-9](04-options.md#r-9): fixtures carry the schema version. [H-6](registers.md#h-6) caveats: alternatives always returned | 45 min |
| 2 Store, ingest queue, degradation | `ForecastRepository` (per-day keys, `MGET` plus `PTTL`, `SET EX RETENTION_TTL`, raw payload key); BullMQ `ingest` queue and processor (job id `{locationId}__{source}`, `removeOnComplete`, limiter, attempts, `setMaxListeners`); `enrich` queue registered without a processor; `IngestService`: required sources from requested classifiers, missing or stale keys, add and await under `COLD_READ_BOUND_MS`, degradation rules; `ingest:last-error`; daily fair-use counter; run events | [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4), [D-5](../ACTIVITY_RANKING_DESIGN.md#d-5), [D-8](../ACTIVITY_RANKING_DESIGN.md#d-8) | Integration tests on the redis service with stubbed adapters: five concurrent cold reads fetch once ([QAS-2](02-requirements.md#qas-2)); a stale key refetches and serves fresh ([QAS-4](02-requirements.md#qas-4)); upstream failure with stored data serves `stale: true` ([QAS-3](02-requirements.md#qas-3)); empty store and failure gives `UPSTREAM_UNAVAILABLE` within 4.5 s ([QAS-11](02-requirements.md#qas-11)); marine-only failure gives `partial: true`; a window change refetches missing dates | [R-6](04-options.md#r-6): processors run in the test process, awaited explicitly. [R-4](04-options.md#r-4): limiter configured from env | 60 min |
| 3 Classifiers and ranking | `Classifier` interface, registry, `RuleSetProvider` with the D-6.1 JSON per activity and `ruleSetVersion`; four classifiers with factors; `RankingService`: compute on read, invariants, one event per ranking with versions, `ranking_anomalies_total{type}`; golden-set tests from the phase 1 fixtures | [D-6](../ACTIVITY_RANKING_DESIGN.md#d-6), [D-7](../ACTIVITY_RANKING_DESIGN.md#d-7) | Unit tests: golden expectations hold (Chamonix January skiing applicable and good; Hintertux applicable, Chamonix today not; Biarritz surfing good; Dubai indoor over outdoor; Springfield day 1 indoor); a fake fifth activity registers and appears with no other change ([QAS-7](02-requirements.md#qas-7)); invariant violations increment the counter. Closes [H-1](registers.md#h-1) or adjusts thresholds with a note | [R-7](04-options.md#r-7): every threshold has its note. [R-2](04-options.md#r-2), [R-3](04-options.md#r-3), [R-12](04-options.md#r-12): reasons name the signal and value | 60 min |
| 4 GraphQL API and boundary | Code-first schema from D-3 written to `schema.gql`; `Activity` enum from the registry; Zod pipe on arguments; Throttler with Redis storage; complexity limit of five locations; error filter with the five codes; `Location.rankings`; `details` and `meta.reasons` resolved on selection; schema snapshot test; end-to-end tests over `fetch` with stubbed adapters: warm, cold, unknown, marine failure, details query | [D-3](../ACTIVITY_RANKING_DESIGN.md#d-3), [D-9](../ACTIVITY_RANKING_DESIGN.md#d-9), [D-10](../ACTIVITY_RANKING_DESIGN.md#d-10) | Warm read answers with zero upstream calls ([QAS-1](02-requirements.md#qas-1)); default query returns only location, status and date-score pairs; details appear only when selected ([QAS-10](02-requirements.md#qas-10)); bad input gives `BAD_USER_INPUT`; six `rankings` selections give `QUERY_TOO_COMPLEX`; schema snapshot committed | [R-8](04-options.md#r-8): the fake-activity test from phase 3 runs against the schema | 45 min |
| 5 Observability, delivery extras, README | OpenTelemetry SDK with console exporter and the anomaly counter as a metric; Helm chart skeleton and `helm lint` in CI; autocannon load job against the composed service with the stub upstream, thresholds asserted (warm p95 under 300 ms, zero 5xx), run on `main` and nightly ([H-5](registers.md#h-5) inside the real service); README: what was built, how to run, assumptions list generated from the register, the store model and AOF ([R-11](04-options.md#r-11)), production path (EKS, Helm, Terraform, Aurora for facts, Datadog), Open-Meteo CC-BY attribution, what to verify next ([H-2](registers.md#h-2), [H-4](registers.md#h-4)) | [D-7](../ACTIVITY_RANKING_DESIGN.md#d-7), [D-11](../ACTIVITY_RANKING_DESIGN.md#d-11) | README complete; CI green including `helm lint`; smoke job reports p95; clean-clone run repeated by a second person or a fresh directory | [R-1](04-options.md#r-1): this phase holds the first three cut lines | 45 min |

Total about 5 h, plus a 30-minute fresh-eyes pass before sending.

## Working rules

### Test-driven development

The testing harness is phase 0, built before any behaviour, so that a failing test can be written at every level from the first phase on. Every behaviour then starts with a failing test written against its acceptance row, committed as the first step of its phase, then the smallest implementation that passes, then refactor. Phase commits contain their tests; the commit message lists the scenarios covered. Each phase is a branch and a pull request; squash-merge produces one commit per phase on `main`, and only after CI is green. A phase without its tests is not merged.

### Quality attribute scenario validation

Every scenario from Step 1 maps to a test, an asserted measure and a gate. The matrix is kept here and ticked as phases merge. The [test plan](../ACTIVITY_RANKING_TEST_PLAN.md) extends it to every requirement with named test cases, coverage gates and fixtures.

| Scenario | Phase | Test level | Asserts | Gate | Status |
| --- | --- | --- | --- | --- | --- |
| [QAS-1](02-requirements.md#qas-1) warm read | 4 | end-to-end, stubbed adapters | zero adapter calls; under 300 ms in-process | CI | open |
| [QAS-2](02-requirements.md#qas-2) cold read | 2, 4 | end-to-end | at most three adapter calls; completes under `COLD_READ_BOUND_MS` | CI | open |
| [QAS-3](02-requirements.md#qas-3), [QAS-11](02-requirements.md#qas-11) upstream failure | 2 | integration | stored data served with `stale: true`; empty store gives `UPSTREAM_UNAVAILABLE` under 4.5 s; marine-only failure gives `partial: true` | CI | done, phase 2 |
| [QAS-4](02-requirements.md#qas-4) stale read | 2 | integration | one refetch, fresh served, `stale: false` | CI | done, phase 2 |
| [QAS-5](02-requirements.md#qas-5), [QAS-6](02-requirements.md#qas-6) names | 1, 4 | unit and end-to-end | Missouri first with four alternatives; `NOT_FOUND` with no forecast call | CI | open |
| [QAS-7](02-requirements.md#qas-7) extensibility | 3, 4 | unit and schema snapshot | a fake activity registers, the enum regenerates, no other file changes | CI | open |
| [QAS-8](02-requirements.md#qas-8) operability | 0 | CI job | `docker compose up` on the built image answers `/health` within 120 s | CI | done, phase 0 |
| [QAS-9](02-requirements.md#qas-9) testability | 0 | CI itself | every level runs; the job asserts its own duration under 5 min; zero live upstream calls | CI | done, phase 0 |
| [QAS-10](02-requirements.md#qas-10) explainability | 4 | end-to-end | details absent by default, present when selected; every ranking event complete | CI | open |
| Load ([NFR-3](02-requirements.md#nfr-3), [NFR-6](02-requirements.md#nfr-6)) | 5 | autocannon against the composed service and the stub upstream | warm p95 under 300 ms, zero 5xx, thresholds fail the job | CI on `main` and nightly; k6 with the same thresholds on the production path | open |

### Hooks and gates

- Pre-commit (lefthook, lint-staged): eslint, prettier, `tsc --noEmit`.
- Commit-msg: commitlint, conventional commits.
- Pre-push: unit and integration against the local Redis.
- CI on every push: frozen install, lint, type check, unit, integration with a redis service, schema snapshot, end-to-end, coverage threshold of 80 percent on the `ranking` and `weather` modules, image build, compose health check, `helm lint`. Load job on `main` and nightly.
- Branch protection on `main`: CI green required, no direct pushes; squash-merge per phase.

### Definition of done per phase

Tests exist and pass for every acceptance row; the matrix rows for the phase are ticked; the pull request is merged green; every cut has one README line with its reason.

## Sequencing and parallelism

Phases 0 to 2 are sequential: each needs the one before. Phase 3 depends only on the `DaySignals` type and the fixtures from phase 1, so with two people it runs in parallel with phase 2. Phase 4 needs 2 and 3. Phase 5 needs 4 for the README, but the Helm chart and the smoke script can start any time after phase 0. One developer runs them in order.

## Spikes for open hypotheses

| Hypothesis | Where | Closes when |
| --- | --- | --- |
| [H-1](registers.md#h-1) weather and geo suffice | Phase 3 golden-set tests | Expectations hold for the five cities and the Hintertux pair, or thresholds are adjusted with a note and the deviation is logged |
| [H-2](registers.md#h-2) POI geodata | Post-exercise | Listed in the README under "what to verify next" |
| [H-4](registers.md#h-4) 6 h TTL churn | Post-exercise | Same |

## Cut lines

Applied in this order if time runs out, each with one line in the README saying what was cut and why:

1. Helm chart skeleton and `helm lint`.
2. autocannon smoke job.
3. OpenTelemetry exporter (pino stays; the counter stays as a log field).
4. `enrich` queue registration.
5. BullMQ: fall back to an in-request promise with an in-memory single-flight map, the option A shape; the store and the API do not change.

Never cut: phases 0 to 4 core behaviour, the golden-set tests, the README assumptions list.

## Dependencies

- Docker running for Compose and for the redis service in local test runs; GitHub Actions provides the service container in CI.
- Node 24 and npm; disk space for three `node_modules` trees.
- Open-Meteo reachable once, to record the fixtures in phase 1; no test or CI step calls it afterwards.
- A public GitHub repository to push to; the recruiter notified after the fresh-eyes pass.

## Schedule

Implementation on 2026-10-15; fresh-eyes read, clean-clone run, make public and send on 2026-10-16 morning. The recruiter's limit of 2026-10-21 holds; the earlier "send on the 15th" target slipped by one day to the architecture review and the spikes, which is recorded here rather than hidden.

> **Step 5 complete** — 2026-10-15. Implementation starts from phase 0; the architecture phase is closed.
