# Step 2 — ASRs + Utility Tree

Part of the [architecture process](../ACTIVITY_RANKING_ARCH_PROCESS.md). Scenario and requirement IDs are defined in [02-requirements.md](02-requirements.md).

## 2a — Utility Tree

Ratings are importance to stakeholders × difficulty to achieve. Top-level nodes are the SEI quality attributes; refinements under them use the project's own terms. Rated by the candidate as proxy for the lead reviewer and the product manager; confirmed or adjusted at Gate 2. Twenty-two leaves, two above the usual ceiling; the testability node accounts for the excess and is kept whole on purpose.

```text
Utility
├── Performance
│   ├── Warm read: zero upstream calls, p95 under 300 ms           [H / L]  → QAS-1
│   ├── Cold read: at most 3 upstream calls, under 3 s             [M / L]  → QAS-2
│   └── Timeliness: TTL and window invalidation; refresh strategy  [H / M]  → QAS-4, OQ-9
├── Availability
│   ├── Upstream failure: serve stored data, flagged stale         [H / M]  → QAS-3
│   ├── Empty store and upstream failure: bounded wait, typed error, partial response [H / M] → QAS-11
│   ├── Keep upstream access: outbound limiter and single-flight   [H / M]  → NFR-9
│   ├── Fault detection: logs per call and refresh; health endpoint [M / L] → NFR-5
│   └── Classifier traceability and anomaly detection             [H / M]  → NFR-13
├── Modifiability
│   ├── Extensibility: add an activity as one classifier plus registration [H / H] → QAS-7
│   ├── Provider-neutral signal model; one adapter per provider    [H / M]  → NFR-11
│   └── Enrichment seam: location facts separate from forecast cache; classifier may be LLM-assisted [H / M] → OQ-16, OQ-18, NFR-8
├── Usability
│   ├── Each score carries its inputs and a reason                 [H / M]  → QAS-10
│   ├── Not-applicable and unavailable activities say why          [H / M]  → DF-3, DF-6
│   └── Name resolution: ambiguous gets alternatives, unknown gets a typed error [M / L] → QAS-5, QAS-6
├── Deployability
│   ├── One-command start, no keys                                 [H / L]  → QAS-8
│   └── CI builds, tests, packages; deploy path described          [M / L]  → NFR-10
├── Testability
│   ├── Unit: classifiers, limiter, invalidation in isolation      [H / L]  → QAS-9
│   ├── Integration: adapters on fixtures, store, refresh flow     [H / M]  → QAS-9
│   ├── Schema and contract: GraphQL schema snapshot, query contract [M / L] → QAS-9
│   ├── End-to-end: one query, running service, stubbed upstream  [M / M]  → QAS-9
│   └── Performance: load smoke test verifying warm and cold read measures [M / L] → QAS-1, QAS-2, QAS-9
└── Security
    └── Input validation and inbound limiter before store or upstream [H / L] → NFR-12
```

## 2b — ASR shortlist and tactics

The High/High and High/Medium leaves collapse into five architecturally significant requirements. High/Low leaves (warm performance, deployability, unit and schema testing, security, name handling) are design work and fall out of [ASR-2](#asr-2) and [ASR-3](#asr-3) once those are in place.

<a id="asr-1"></a>
**ASR-1 — Classifier contract and registry** [H / H]. Leaves: [QAS-7](02-requirements.md#qas-7), [QAS-10](02-requirements.md#qas-10), [DF-3](02-requirements.md#df-3), [OQ-16](registers.md#oq-16). Decision forced: the shape of an activity classifier and how the API discovers it. Inputs are normalised daily signals plus location context (elevation, a marineDataAvailable flag derived from the presence of marine data). Outputs are a score, an applicability flag with a reason, and the inputs used. A registry makes adding an activity one module plus one registration, and the API derives its activity list from the registry instead of hard-coding four. The contract must allow an asynchronous classifier with external inputs so an LLM-assisted one can be added without changing the pipeline. Tactics: encapsulate (classifier interface), use an intermediary (registry), separate concerns (signals, scoring, API), defer binding (activity list resolved from the registry at startup). Pattern choice is Step 4 work; the candidate is a registry of strategies. Chain of responsibility is a weak fit because every classifier runs and none short-circuits.

<a id="asr-2"></a>
**ASR-2 — Provider-neutral signal model** [H / M]. Leaves: [NFR-11](02-requirements.md#nfr-11), [A-34](registers.md#a-34), [A-41](registers.md#a-41), [QAS-9](02-requirements.md#qas-9). Decision forced: what the store holds. Normalised daily signals keyed by location and forecast window, not Open-Meteo payloads; forecast and marine merged into one record per location and day; a provider adapter maps each upstream to the model. This seam is also what makes testing fixture-based. Tactics: abstract common services, use an intermediary (adapter), restrict dependencies (only adapters know provider formats). Revised at the Gate 4 review: values are stored one key per location, source and date, so the window is a set of keys rather than part of a key; the seam and the tactics are unchanged.

<a id="asr-3"></a>
**ASR-3 — Refresh strategy under fair use** [H / M]. Leaves: [QAS-4](02-requirements.md#qas-4), [QAS-1](02-requirements.md#qas-1), [NFR-9](02-requirements.md#nfr-9), [OQ-9](registers.md#oq-9). Decision forced: when data is fetched. Refresh on read when stale, background refresh of known locations, or both. In every variant: store-first reads, an outbound limiter at the fair-use limits, single-flight per location, and invalidation when the forecast window no longer covers today. Tactics: introduce cache (the store), manage sampling rate (limiter), use asynchronous processing (background refresh), bound resource use (single-flight). Revised at the Gate 4 review: stale-while-revalidate was replaced by a blocking, single-flight refresh on stale reads, because incremental delivery (S-5) is not available and a stale answer with a client re-query is poor consumer experience; the stale flag remains only for the degradation path.

<a id="asr-4"></a>
**ASR-4 — Degradation on upstream failure** [H / M]. Leaves: [QAS-3](02-requirements.md#qas-3), [QAS-11](02-requirements.md#qas-11), [NFR-4](02-requirements.md#nfr-4), [DF-6](02-requirements.md#df-6). Decision forced: the read path is store-first and a refresh failure never fails a read that has stored data. With an empty store the wait is bounded (2 s timeout, one retry) and the answer is a typed `UPSTREAM_UNAVAILABLE` with a retry hint and the resolved location. Degradation is per source: forecast is mandatory, marine is optional, so a marine-only failure costs only surfing. Tactics: timeout, limited retry, graceful degradation, exception handling at the adapter boundary, partial response.

<a id="asr-5"></a>
**ASR-5 — Location facts and the enrichment seam** [H / M]. Leaves: [OQ-16](registers.md#oq-16), [OQ-18](registers.md#oq-18), [NFR-8](02-requirements.md#nfr-8), [NFR-11](02-requirements.md#nfr-11), [NFR-13](02-requirements.md#nfr-13). Decision forced: the data model has two storage classes from day one. Forecast data is a cache: TTL, window-keyed, rebuildable. Location facts are long-lived and versioned: the geocoding result (name, coordinates, elevation, timezone, marineDataAvailable flag) is the first fact, and points of interest, attractions or walkability would be further facts. Enrichment, whether a deterministic source such as OpenStreetMap or an LLM, is an adapter on the [ASR-2](#asr-2) provider seam that writes facts, and the [ASR-1](#asr-1) classifier contract takes facts as input. The exercise stays weather and geo only ([A-23](registers.md#a-23)); a proof of concept for sightseeing enrichment is deferred and recorded as a risk in Step 3. If the LLM path is taken, [NFR-8](02-requirements.md#nfr-8) applies and the classifier version from [NFR-13](02-requirements.md#nfr-13) doubles as the prompt version. Tactics: separate concerns (facts versus cache), encapsulate (fact store behind an interface), defer binding (enrichment source chosen later), maintain a version of the data and of the classifier.

Sensitivity preview for Step 3: [ASR-1](#asr-1), [ASR-2](#asr-2) and [ASR-5](#asr-5) share one seam, the signal and facts model that classifiers consume. A wrong model breaks all three; the options in Step 3 are judged first on that seam, then on the refresh strategy of [ASR-3](#asr-3).

> **Review Gate 2** — passed 2026-10-14. Utility tree on the SEI attributes, 22 leaves; five ASRs; Hypotheses to Verify started with [H-1](registers.md#h-1) to [H-6](registers.md#h-6).
