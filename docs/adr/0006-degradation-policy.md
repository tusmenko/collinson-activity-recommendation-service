# ADR-0006 — Degradation policy

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-14 |
| Addresses | [NFR-4](../arch/02-requirements.md#nfr-4), [DF-6](../arch/02-requirements.md#df-6), [QAS-3](../arch/02-requirements.md#qas-3), [QAS-11](../arch/02-requirements.md#qas-11), [ASR-4](../arch/03-asrs.md#asr-4), [A-19](../arch/registers.md#a-19) |
| Supersedes | — |
| Design | [D-3](../ACTIVITY_RANKING_DESIGN.md#d-3), [D-8](../ACTIVITY_RANKING_DESIGN.md#d-8), [D-9](../ACTIVITY_RANKING_DESIGN.md#d-9) |

**Context.** Open-Meteo can time out or fail, and the operator wants upstream failures visible and non-fatal ([NFR-4](../arch/02-requirements.md#nfr-4)). Forecast and marine are separate endpoints that fail independently. One query can rank alternatives, each with its own fetch.

**Decision.** The read path is store-first, and a failed refetch never fails a read that has stored data: that data is served flagged stale. Each upstream call has a 2 s timeout and one retry; a read waits at most `COLD_READ_BOUND_MS` (4.5 s). With no stored forecast the answer is a typed `UPSTREAM_UNAVAILABLE` with `retryAfterSeconds` and the resolved location. Forecast is mandatory and marine optional: a marine-only failure makes surfing `UNAVAILABLE` and sets `partial`. A payload that fails validation counts as a failed source. `Location.rankings` is nullable, so a failure ranking one alternative nulls only that field and is reported in `errors`.

**Rationale.**

- Every request with stored data is answered ([QAS-3](../arch/02-requirements.md#qas-3)).
- The wait is bounded and the error typed with a retry hint ([QAS-11](../arch/02-requirements.md#qas-11), [DF-6](../arch/02-requirements.md#df-6)).
- A marine outage costs surfing only, not the other three activities.
- With the field non-null, one alternative without a forecast nulled the whole response; nullable keeps the primary answer (E-API-15).

**Alternatives rejected.**

- Failing the whole request on any upstream error: discards stored data the consumer could use.
- Unbounded retries: an outage holds requests open and spends fair use.
- All-or-nothing alternatives: one failed place empties the whole answer.

**Consequences.**

- Easier: failures show in `meta.stale`, `meta.sources` and `ingest:last-error` without an outage.
- Harder: consumers must read `stale`, `partial` and `errors`.
- Accepted: during an outage served data can be up to `RETENTION_TTL` (24 h) old.
