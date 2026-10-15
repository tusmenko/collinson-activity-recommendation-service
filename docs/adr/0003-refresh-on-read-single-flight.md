# ADR-0003 — Refresh on read with single-flight queued jobs

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-15 |
| Addresses | [NFR-1](../arch/02-requirements.md#nfr-1), [NFR-3](../arch/02-requirements.md#nfr-3), [NFR-9](../arch/02-requirements.md#nfr-9), [QAS-2](../arch/02-requirements.md#qas-2), [QAS-4](../arch/02-requirements.md#qas-4), [ASR-3](../arch/03-asrs.md#asr-3), [A-51](../arch/registers.md#a-51) |
| Supersedes | — |
| Design | [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4), [D-5](../ACTIVITY_RANKING_DESIGN.md#d-5), [D-9](../ACTIVITY_RANKING_DESIGN.md#d-9) |

**Context.** Stored data must be refreshed ([NFR-1](../arch/02-requirements.md#nfr-1)) without spending Open-Meteo's fair use (600 calls a minute, 10,000 a day) on places nobody asks for. Several readers can hit the same expired location at once, and the service may run as more than one instance. Incremental delivery is unavailable (spike S-5), so a stale answer cannot be replaced within the same response.

**Decision.** A read that finds a source missing or older than `FRESHNESS_TTL` enqueues one BullMQ job per location and source (job id `{locationId}__{source}`, `removeOnComplete: true`) and waits for it under `COLD_READ_BOUND_MS`, then serves fresh data. Concurrent readers add the same job id and wait on the same job. Cold and stale reads are one path. Stored data is served flagged stale only when the refetch fails or the bound expires. A queue limiter and a daily Redis counter keep outbound calls under fair use.

**Rationale.**

- One upstream call per expiry per location and source, however many readers wait; spike S-3 showed concurrent adds running once.
- Fair use is spent only on requested places, at 500 calls a minute and 9,000 a day ([NFR-9](../arch/02-requirements.md#nfr-9)).
- Job-id deduplication and the limiter live in Redis, so they hold across instances and survive a restart.
- The stale flag has one meaning, "the refetch failed" ([A-51](../arch/registers.md#a-51)); the load job measured a cold read at 143 ms against the stub upstream ([QAS-2](../arch/02-requirements.md#qas-2)).

**Alternatives rejected.**

- Scheduled refresh of known locations: spends fair use on places nobody asks for; rejected at Gate 3.
- Stale-while-revalidate: chosen at Gate 3 and withdrawn at the Gate 4 review ([A-45](../arch/registers.md#a-45)); without `@defer` a stale answer plus a client re-query is poor consumer experience.
- In-memory single-flight map and token bucket (Option A): lost on restart and wrong under more than one instance; kept as the fallback shape.

**Consequences.**

- Easier: processors move to a worker deployment unchanged; enrichment is a second queue.
- Harder: queue lifecycle in integration tests ([R-6](../arch/04-options.md#r-6)); the daily cap needs its own counter.
- Accepted: the first reader after an expiry waits one upstream round trip.
