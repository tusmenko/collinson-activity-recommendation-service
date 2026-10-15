# Implementation Handoff

For the session that builds the service. The architecture phase is closed; nothing here is open for re-decision unless a hypothesis fails, in which case the registers and the ADR log are updated first and the code second.

## Read in this order

1. [ACTIVITY_RANKING_ARCH_PROCESS.md](ACTIVITY_RANKING_ARCH_PROCESS.md): index and status.
2. [adr/0001-pragmatic-option-nestjs-redis-bullmq.md](adr/0001-pragmatic-option-nestjs-redis-bullmq.md): the decision and its change log.
3. [ACTIVITY_RANKING_DESIGN.md](ACTIVITY_RANKING_DESIGN.md): D-1 to D-11; D-2 is the environment contract, D-6.1 the thresholds.
4. [ACTIVITY_RANKING_TEST_PLAN.md](ACTIVITY_RANKING_TEST_PLAN.md): test ids per requirement, coverage gates, fixtures.
5. [CODING_STANDARDS.md](CODING_STANDARDS.md): limits, layering, tools.
6. [arch/06-plan.md](arch/06-plan.md): phases, working rules, validation matrix, cut lines.
7. [arch/registers.md](arch/registers.md): assumptions for the README; H-1 closes in phase 3.
8. [ASSIGNMENT.md](ASSIGNMENT.md): the brief, for the README's framing.

## Decisions in force

- NestJS 12, ESM, Vitest 4, graphql 16 with Apollo Server 5 and `@as-integrations/express5`; plain Zod with a custom pipe; no `nestjs-zod`, no `class-validator`, no `@defer`.
- Redis with AOF is the only store: facts without TTL, forecast one key per location, source and date under `RETENTION_TTL`, raw payload per source; `FRESHNESS_TTL` applied as a `PTTL` threshold.
- Refresh on read: a stale or missing read waits for one single-flight BullMQ job per location and source (job id `{locationId}__{source}`, `removeOnComplete: true`) under `COLD_READ_BOUND_MS`; the stale flag only when the refetch failed.
- Scores computed on read by registered classifiers; thresholds in JSON behind `RuleSetProvider` with `ruleSetVersion`; skiing gated on daily max `snow_depth`; surfing gated on marine data presence, scored by wave height and period.
- Default response is location, per-activity status and date-score pairs, and `meta`; details and reasons only on selection; no rank field.
- One structured event per ranking with versions; invariants; `ranking_anomalies_total{type}`.
- Docker Compose to run (`api`, `redis`); Helm skeleton committed, not deployed; GitHub Actions as the gate.

## Non-negotiables

- TypeScript; GraphQL; Open-Meteo only; no front end; the public repository never contains `private/`.
- Phase 0 builds the testing harness before any behaviour; every phase opens with its red tests; one pull request per phase merged on green CI.
- Cut lines in order: Helm skeleton, load job, OpenTelemetry exporter, `enrich` registration, BullMQ. Each cut is one README line with its reason. Phases 0 to 4 core behaviour, the golden set and the README assumptions list are never cut.
- Standards are enforced by the tools in phase 0; an exception is an inline disable with a reason.

## Phase checklist

| Phase | Deliverable | Exit |
| --- | --- | --- |
| 0 | Scaffold, harness, hooks, CI, Compose | compose health green; one sample test per level green; network guard proven |
| 1 | Adapters, facts repository, fixtures recorded into the stub | U-LOC, U-ADAPT green |
| 2 | Forecast repository, queues, ingest service, degradation | I-STORE, I-INGEST, I-QUEUE green |
| 3 | Classifiers, registry, rules, ranking, events | U-RANK, U-SKI, U-SURF, U-EVENT green; H-1 closed or thresholds adjusted with a note |
| 4 | Schema, pipe, throttler, complexity, resolvers, e2e | S-SCHEMA, E-API green |
| 5 | OTel, Helm skeleton, load job, README | L-WARM, L-COLD, O-COMPOSE green; README complete |

## Environment

- Node 24, npm; Docker Desktop running (verified 2026-10-15, server 29.8); 31 GB free after cleanup, keep an eye on it.
- Recorded upstream responses from the spikes are in `/tmp/s6/*.json` (five golden cities, forecast and marine) and `/tmp/om_probe.json` (snow depth at Hintertux, Chamonix, Sölden); copy them into `test/fixtures/open-meteo/v1/` in phase 1 instead of refetching. The archive day for Chamonix (2026-01-10 to 16) and the geocoding samples need one live fetch each.
- Throwaway spike code in `/tmp/spikes/{s12,s34,s5}` shows working configurations for Vitest with decorators, the Zod pipe, and the BullMQ pattern; copy ideas, not files.

## What to update as you go

- `docs/arch/06-plan.md`: tick matrix rows in the phase's pull request.
- `docs/arch/registers.md`: H-1 status in phase 3; any assumption overturned by reality gets a new status and a line in the README.
- `docs/adr/`: a changed decision is a new record that supersedes ADR-0001; never edit the accepted text.
- `README.md`: what was built, how to run, the assumptions list from the register, the store model and AOF, the production path, Open-Meteo CC-BY attribution, cuts, what to verify next (H-2, H-4).
- `docs/ACTIVITY_RANKING_ARCH_PROCESS.md`: no changes expected; the architecture phase is closed.

## Commits

Conventional commits, scope is the module, body names the test ids or scenarios. Keep the attribution lines the session provides. Push after every green phase; make the repository public after the fresh-eyes pass on 2026-10-16.
