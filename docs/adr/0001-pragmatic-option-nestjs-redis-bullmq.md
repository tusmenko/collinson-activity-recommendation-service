# ADR-0001 — Pragmatic option on NestJS, Redis and BullMQ

| Field | Value |
| --- | --- |
| Status | proposed, awaiting Gate 4 sign-off |
| Date | 2026-10-14 |
| Deciders | Yevhenii (decision authority); Shane Patrick as proxy product manager at review |
| Supersedes | — |
| Superseded by | — |
| Source | [Step 4](../arch/05-recommendation.md); options in [Step 3](../arch/04-options.md); mechanisms in the [design document](../ACTIVITY_RANKING_DESIGN.md) |

**Decision.** Build Option C: one NestJS image, GraphQL code-first, Redis with AOF as the only store behind repository interfaces, stale-while-revalidate refresh executed as BullMQ jobs, scores computed on read by registered classifiers, Zod at every boundary, Vitest, pino with OpenTelemetry, Docker Compose to run and a Helm chart skeleton to show the Kubernetes path. Mechanisms: [D-1](../ACTIVITY_RANKING_DESIGN.md#d-1) to [D-11](../ACTIVITY_RANKING_DESIGN.md#d-11).

**Context.**

- The brief fixes Node.js, GraphQL, Open-Meteo and the rule to persist rather than call per request; it leaves modelling, storage and refresh open.
- The reviewer clones, runs and queries in one sitting; the role names Kubernetes, Helm, Terraform, Aurora and Redis-class services; the build time is one evening.
- Classifiers and provider integrations are the confirmed growth points; the data is a TTL cache plus a few small location facts.

**Rationale.**

- Store: the data needs no SQL yet; Redis gives TTL, persistence and the queue substrate in one container; PostgreSQL stays the target for facts once enrichment makes them relational ([A-47](../arch/registers.md#a-47), [R-11](../arch/04-options.md#r-11); [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4)).
- Refresh: stale-while-revalidate keeps warm latency constant and bounds staleness to one request; scheduled refresh would spend fair use on unrequested locations ([A-45](../arch/registers.md#a-45); [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4)).
- Execution: BullMQ makes revalidation durable, deduplicates per location and source, limits outbound calls per queue, and gives enrichment a second queue ([D-5](../ACTIVITY_RANKING_DESIGN.md#d-5)).
- Scoring on read keeps the store pure signals and lets classifiers change without re-scoring ([D-6](../ACTIVITY_RANKING_DESIGN.md#d-6)).
- Zod gives one schema per boundary with inferred types; Vitest over Jest for ESM and speed, Jest the stated swap ([D-1](../ACTIVITY_RANKING_DESIGN.md#d-1), [D-10](../ACTIVITY_RANKING_DESIGN.md#d-10)).

**Consequences.**

- Easier: adding an activity (one module, one registration); adding a provider or enrichment source (one adapter or one processor); splitting a worker (processors move unchanged); replaying upstream payloads; auditing any score from its event.
- Harder: Redis is required to run, so `docker compose up` is the only supported start; queue processors add lifecycle to integration tests; fair-use tiers are approximated by a per-minute queue limiter plus a daily counter.
- Accepted: one flagged stale response per TTL expiry; Redis read as "just a cache" unless the README explains the model; `@defer` deferred to tier 2 pending [H-7](../arch/registers.md#h-7); several alternatives selected in one query are bounded by the complexity limit rather than forbidden.

**Rejected alternatives.**

- Option A: no durability for revalidation; hand-written lock and limiter wrong under more than one instance; little of the role's stack shown. Kept as the fallback shape if time runs out.
- Option B: two to three days of platform work for a one-evening exercise. Kept as the production path in the README.
- MongoDB: nothing Redis does not already give. PostgreSQL now: migrations and a second container for data that does not exist yet.
- Scheduled refresh: spends fair use on unrequested locations. Precomputed scores: couple the store to classifier versions. class-validator: duplicates types and does not validate upstream payloads.

## Change log

| Date | Change |
| --- | --- |
| 2026-10-14 | Drafted after Gate 3; revised at the Gate 4 review: per-day forecast keys, minimal default response, Zod configuration, one job per location and source. |
