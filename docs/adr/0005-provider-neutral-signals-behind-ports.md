# ADR-0005 — Provider-neutral signals behind ports

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-15 |
| Addresses | [NFR-11](../arch/02-requirements.md#nfr-11), [ASR-2](../arch/03-asrs.md#asr-2), [A-41](../arch/registers.md#a-41) |
| Supersedes | — |
| Design | [D-1](../ACTIVITY_RANKING_DESIGN.md#d-1), [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4), [D-5](../ACTIVITY_RANKING_DESIGN.md#d-5) |

**Context.** Provider integrations are the second confirmed growth point (Gate 1). Open-Meteo can change its response shape and move scores without anyone noticing ([R-9](../arch/04-options.md#r-9)). Tests run offline against recorded fixtures and a stub upstream.

**Decision.** The store holds normalised `DaySignals` and `LocationFacts`, never provider payloads. Everything specific to Open-Meteo (hosts, parameters, pinned Zod payload schemas, timeouts) lives in a typed `OpenMeteoClient` in `infra/open-meteo` with the endpoints `searchLocations`, `forecast` and `marine`. Source adapters translate validated payloads to domain types and are injected through abstract-class ports. The last raw payload per source is stored.

**Rationale.**

- A second provider is a client plus its adapters; store, classifiers and API are untouched ([NFR-11](../arch/02-requirements.md#nfr-11)).
- Payloads are validated against a pinned schema version, so drift fails validation, takes the degradation path and emits an anomaly event ([A-41](../arch/registers.md#a-41)).
- The raw payload kept per source allows replay and drift checks.
- One optional `UPSTREAM_BASE_URL` points the whole client at the stub upstream for tests and the `demo` profile ([D-12](../ACTIVITY_RANKING_DESIGN.md#d-12)).

**Alternatives rejected.**

- Storing provider payloads: couples the store and the classifiers to Open-Meteo's shape.
- A client generated from Open-Meteo's official FlatBuffers SDK: it has no geocoding, uses a binary format, and would break the recorded JSON fixtures and the stub upstream.

**Consequences.**

- Easier: swapping a provider touches the client, its adapters and the fixtures only.
- Harder: fixtures must follow the pinned schema version.
- Accepted: one translation layer more than reading payloads directly.
