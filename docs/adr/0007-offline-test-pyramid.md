# ADR-0007 — Offline test pyramid with a stub upstream and a network guard

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-14 |
| Addresses | [NFR-6](../arch/02-requirements.md#nfr-6), [QAS-9](../arch/02-requirements.md#qas-9), [A-21](../arch/registers.md#a-21) |
| Supersedes | — |
| Design | [D-10](../ACTIVITY_RANKING_DESIGN.md#d-10); the [test plan](../ACTIVITY_RANKING_TEST_PLAN.md) |

**Context.** Robust, testable code is a stated reviewer concern (Step 0). Tests that call Open-Meteo are slow, flaky and spend fair use. The whole pyramid must run in CI on every push in under five minutes.

**Decision.** Unit, integration, schema and end-to-end tests all run offline. Adapters and the end-to-end suite use payloads recorded once from Open-Meteo and served by a stub upstream, which also simulates timeouts, 5xx, malformed and null responses. A network guard fails any test that opens a socket outside localhost. Coverage gates apply per module, with a floor for every file. A load job runs against the `demo` profile on `main` and nightly.

**Rationale.**

- Zero live calls in CI ([QAS-9](../arch/02-requirements.md#qas-9)); the network guard proves it rather than trusting it.
- Fixtures were recorded with the adapters' exact requests, so they match the adapter contract byte for byte; recording again costs 21 calls ([D-12](../ACTIVITY_RANKING_DESIGN.md#d-12)).
- Every level runs in CI well inside five minutes: nine jobs of 14 to 38 s each at phase 0.
- The per-file floor (60 % lines, 50 % branches) keeps every unit covered, not only the modules that carry features.

**Alternatives rejected.**

- Mocking at the HTTP library level: tests the mock rather than the request the adapter sends; the stub also serves the `demo` profile and the load job.
- Live calls in CI: flaky, slow and against fair use.
- Coverage by feature only: an untested file can hide inside a well-covered module.

**Consequences.**

- Easier: the service runs without Open-Meteo, and the degradation paths can be shown by hand.
- Harder: fixtures must be recorded again when the pinned schema changes.
- Accepted: drift in the live API shows only at run time, as an anomaly; an optional live contract job is the production path ([R-9](../arch/04-options.md#r-9)).
