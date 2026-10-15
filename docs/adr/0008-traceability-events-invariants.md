# ADR-0008 — Traceability through structured events and invariants

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-14 |
| Addresses | [NFR-5](../arch/02-requirements.md#nfr-5), [NFR-13](../arch/02-requirements.md#nfr-13), [A-30](../arch/registers.md#a-30), [A-42](../arch/registers.md#a-42) |
| Supersedes | — |
| Design | [D-7](../ACTIVITY_RANKING_DESIGN.md#d-7) |

**Context.** At Gate 2 the proxy product manager asked that every score be traceable to its data and classifier version, and that classification anomalies be detectable. Thresholds will change ([OQ-2](../arch/registers.md#oq-2)), and an LLM-assisted classifier may come later ([NFR-8](../arch/02-requirements.md#nfr-8)).

**Decision.** Each ranking emits one structured pino event: request id, location, provider, fetched-at per source, and per activity the classifier id and version, rule-set version, status, scores and factors. Invariants run in the request: score within 0 to 100, `WINDOW_DAYS` scores per applicable activity, no score when not applicable, and a change of `marineDataAvailable` on refresh. A violation logs at warn and increments `ranking_anomalies_total{type}` through OpenTelemetry. Every ingest run emits an event with duration and outcome.

**Rationale.**

- Any score is auditable from its event to the data and versions that produced it ([NFR-13](../arch/02-requirements.md#nfr-13)).
- Invariant violations are counted, so a monitor can alert on them ([A-42](../arch/registers.md#a-42)).
- The same events feed an offline golden-set evaluation, and the classifier version doubles as a prompt version ([A-30](../arch/registers.md#a-30)).

**Alternatives rejected.**

- Metrics only: they count that a score is wrong, not why.
- Logging at the resolver only: loses the per-activity versions and the ingest side.

**Consequences.**

- Easier: audit and replay; on the production path a Datadog log pipeline and a monitor on the counter.
- Harder: event volume grows with activities and days.
- Accepted: events go to stdout in the exercise, with no retention or query layer.
