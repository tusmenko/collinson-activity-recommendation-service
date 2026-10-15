# ADR-0002 — Redis with AOF as the only store

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-14 |
| Addresses | [persist constraint](../arch/02-requirements.md#constraints), [NFR-1](../arch/02-requirements.md#nfr-1), [ASR-5](../arch/03-asrs.md#asr-5), [A-43](../arch/registers.md#a-43), [A-47](../arch/registers.md#a-47), [A-49](../arch/registers.md#a-49) |
| Supersedes | — |
| Design | [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4) |

**Context.** The brief requires the weather data to be persisted rather than fetched on every request, and leaves the store open. The data is a forecast cache with a natural expiry plus a few small location facts; enrichment will add more facts later. The reviewer runs the service in one sitting, so every extra container costs start time.

**Decision.** Redis with append-only persistence on a volume is the only store, behind `FactsRepository` and `ForecastRepository` interfaces. Forecast data is stored one key per location, source and date (`forecast:v1:{locationId}:{source}:{date}`) with `RETENTION_TTL` as the key TTL; a key is stale when its `PTTL` shows it is older than `FRESHNESS_TTL`. Location facts live under keys without TTL. The last raw payload per source is kept beside the signals.

**Rationale.**

- TTL and persistence are native: expiry needs no sweeper and freshness needs no value parsing ([A-49](../arch/registers.md#a-49)).
- The data is a cache plus small facts, so SQL buys nothing yet; the same Redis hosts the queues and the throttler storage ([A-47](../arch/registers.md#a-47)).
- One key per date turns a window change or local midnight into a set of missing keys, read with one `MGET`; spike S-4 measured p95 at most 3 ms on loopback.
- Facts without TTL are a second storage class from day one, so enrichment lands without a migration ([A-43](../arch/registers.md#a-43), [ASR-5](../arch/03-asrs.md#asr-5)).

**Alternatives rejected.**

- PostgreSQL now: migrations and a second container for facts that do not exist yet. It stays the target for facts once enrichment makes them relational ([R-11](../arch/04-options.md#r-11)).
- MongoDB: nothing Redis does not already give here.
- Request-shaped keys: couple the cache to the query shape and duplicate data across overlapping requests.
- Per-source blobs with coverage logic: replaced at the Gate 4 review by Redis-native expiry, which needs no parsing.

**Consequences.**

- Easier: one container to run; a provider schema bump is a key-prefix change and a refetch.
- Harder: facts durability rests on AOF; no relational queries once facts grow.
- Accepted: Redis can read as "just a cache"; the README explains the model ([R-11](../arch/04-options.md#r-11)).
