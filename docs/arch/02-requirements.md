# Step 1 — Requirements Recomposition + Current Architecture Baseline

Part of the [architecture process](../ACTIVITY_RANKING_ARCH_PROCESS.md). Registers referenced by ID live in [registers.md](registers.md).

## 1a — Requirements

Traceability rule: every item below names its source. "Brief" means a line of `ASSIGNMENT.md`. "Step 0" means a stakeholder concern recorded in the stakeholder map. Anything the brief does not say is derived; derived items are assumptions, carry an assumption ID, and stay open until the proxy product manager confirms them. Numbers in measures are proposals, never facts.

## Functional requirements from the brief

| ID | Requirement | Source | MoSCoW | Owner |
| --- | --- | --- | --- | --- |
| <a id="fr-1"></a>FR-1 | Accept a city or town as the input. | Brief: "takes a city or town" | Must | Product manager |
| <a id="fr-2"></a>FR-2 | Cover the next 7 days. | Brief: "the next 7 days" | Must | Product manager |
| <a id="fr-3"></a>FR-3 | Cover each of four activities: skiing, surfing, outdoor sightseeing, indoor sightseeing. | Brief: the activity list | Must | Product manager |
| <a id="fr-4"></a>FR-4 | For each activity, rank how good each day will be. | Brief: "ranks how good the next 7 days will be for each of these activities" | Must | Product manager |

The brief specifies nothing else functionally. Everything below is derived.

## Derived behaviour (assumptions, not requirements)

| ID | Behaviour | Gap it fills | Traced to | Status |
| --- | --- | --- | --- | --- |
| <a id="df-1"></a>DF-1 | When the name matches several places, use the best match (the first result whose name equals the query case-insensitively, else the first result) and return it with the alternatives. | [FR-1](#fr-1) is silent on ambiguity; geocoding returns several matches. | [OQ-5](registers.md#oq-5), [A-10](registers.md#a-10) | open |
| <a id="df-2"></a>DF-2 | When the name matches nothing, return a typed not-found error. | [FR-1](#fr-1) is silent on failure. | [OQ-13](registers.md#oq-13), [A-14](registers.md#a-14) | open |
| <a id="df-3"></a>DF-3 | When the location cannot support an activity, return it as not applicable with the reason. | [FR-3](#fr-3) and [FR-4](#fr-4) are silent on inland surfing and snowless skiing. | [OQ-3](registers.md#oq-3), [OQ-4](registers.md#oq-4), [A-8](registers.md#a-8), [A-9](registers.md#a-9) | open |
| <a id="df-4"></a>DF-4 | The factors and inputs behind a score are available when a client selects them, and are always recorded in the ranking event. | Step 0, API consumer: "explainable rankings". | [OQ-14](registers.md#oq-14), [A-15](registers.md#a-15) | open |
| <a id="df-5"></a>DF-5 | With each response, show when the data was fetched. | Follows from the persist-and-refresh constraint; the consumer cannot otherwise judge the ranking. | [OQ-15](registers.md#oq-15), [A-16](registers.md#a-16) | open |
| <a id="df-6"></a>DF-6 | When only the marine source fails, surfing is reported as unavailable (distinct from not applicable), the other activities are computed, and the response is flagged partial. When the forecast source fails and nothing is stored, return a typed `UPSTREAM_UNAVAILABLE` error with a retry hint and the resolved location if geocoding succeeded. | [NFR-4](#nfr-4) is silent on the empty-store case and on per-source failure. | [QAS-11](#qas-11), [A-19](registers.md#a-19) | open |
| <a id="df-7"></a>DF-7 | A request may name a subset of activities; only the sources those classifiers require are fetched and only those classifiers run. | [FR-3](#fr-3) is silent on partial requests; GraphQL field selection makes partial results natural. | [A-48](registers.md#a-48) | open |

## Non-functional requirements

| ID | Quality | Requirement | Source | Proposed measure | Assumption |
| --- | --- | --- | --- | --- | --- |
| <a id="nfr-1"></a>NFR-1 | Performance: timeliness | Stored weather data is refreshed. | Brief: "how you model, store, and refresh it is part of the problem" | Served data no older than a TTL of 6 h plus one refresh cycle; TTL configurable | [A-11](registers.md#a-11) |
| <a id="nfr-2"></a>NFR-2 | Deployability | A reviewer can run the service from the README. | Brief: "how to run it"; Step 0, Operator | One command on a clean clone, under 2 minutes, no key or account | [A-17](registers.md#a-17) |
| <a id="nfr-3"></a>NFR-3 | Performance | Reads answer quickly. | Step 0, API consumer: "fast response" | Warm read: zero upstream calls, p95 under 300 ms locally. Cold read: at most three upstream calls, under 3 s | [A-18](registers.md#a-18) |
| <a id="nfr-4"></a>NFR-4 | Availability | Upstream failure does not take the service down. | Step 0, Operator: "failures of the upstream visible and non-fatal" | Serve stored data flagged stale; forecast failure with an empty store returns a typed `UPSTREAM_UNAVAILABLE` error with a retry hint and the resolved location, within a 2 s timeout plus one retry (under 4.5 s total); marine-only failure degrades surfing to unavailable and flags the response partial | [A-19](registers.md#a-19) |
| <a id="nfr-5"></a>NFR-5 | Availability: fault detection | Refresh activity and upstream calls are visible to the operator. | Step 0, Operator: "refresh job observable" | Each upstream call and refresh logged with latency and outcome; health endpoint | [A-20](registers.md#a-20) |
| <a id="nfr-6"></a>NFR-6 | Testability | The full testing pyramid runs without the live upstream: unit, integration, schema and contract, end-to-end, plus a performance smoke test. | Step 0, Hiring manager: "robust and testable"; goal 5 | Unit tests for classifiers, limiter and invalidation; integration tests for adapters on recorded fixtures, the store and the refresh flow; schema snapshot and query contract tests for the GraphQL API, with a Pact-style consumer contract described as the production path; one end-to-end query through the running service with a stubbed upstream; a performance smoke test against the running service (k6 or autocannon style) reporting p95 for warm reads and wall time for one cold read, run locally and as an optional CI job, with the inbound limiter raised by configuration so it measures the service rather than the limiter; all in CI under 5 minutes | [A-21](registers.md#a-21) |
| <a id="nfr-7"></a>NFR-7 | Modifiability: extensibility | A new activity can be added, including one that needs a new data signal, without changing ingest, store, or API code beyond registering the new activity classifier. | Proxy product manager at Gate 1, 2026-10-14: classifiers are the natural point of growth. | Adding an activity is one new classifier module plus registration; existing classifiers and tests untouched | [A-22](registers.md#a-22) |
| <a id="nfr-8"></a>NFR-8 | LLM-ops | If an LLM-assisted classifier is built ([OQ-16](registers.md#oq-16)), it carries versioned prompts, call observability, provider abstraction and validated structured output. | Goal 6 | Applies only if the option is chosen in Step 3 | [A-0](registers.md#a-0) |
| <a id="nfr-9"></a>NFR-9 | Availability: upstream access | Outbound calls to Open-Meteo stay within the fair-use limits regardless of inbound load. | Fair-use constraint; proxy product manager at Gate 1, 2026-10-14: implement from the start. | Outbound limiter at 600 per minute, 5,000 per hour, 10,000 per day, configurable; single-flight per location so concurrent cold reads fetch once; query complexity limit of five locations per query | [A-27](registers.md#a-27), [A-32](registers.md#a-32) |
| <a id="nfr-10"></a>NFR-10 | Deployability | The service builds, tests and packages from CI with no manual steps; the production deploy path uses the stack named in the role. | Goal 5; role description: build, deploy and run systems end to end without manual configuration. | GitHub Actions on every push: lint, type check, tests, Docker image build. Deploy path described, not executed: image to a registry, Helm chart to EKS, Terraform for infrastructure, Datadog for telemetry | [A-40](registers.md#a-40) |
| <a id="nfr-11"></a>NFR-11 | Modifiability: provider neutrality | A weather or enrichment provider can be added or replaced behind a provider interface; the stored model is provider-neutral. | Proxy product manager at Gate 1, 2026-10-14: integrations are a natural point of extension. | Store holds normalised daily signals, not Open-Meteo payloads; one adapter per provider; swapping a provider touches the adapter and its fixtures only; upstream payloads validated against a pinned provider schema version at the adapter, raw snapshot stored, drift surfaces as an anomaly event ([NFR-13](#nfr-13)) | [A-41](registers.md#a-41) |
| <a id="nfr-12"></a>NFR-12 | Security | Every inbound request is validated and rate-limited at the API boundary before any store or upstream access. | Proxy product manager at Gate 1, 2026-10-14: validation is critical; inbound limits from the start. | Schema types plus explicit validation of length, charset and bounds; per-client token bucket, configurable; typed errors for malformed or over-limit requests; tests for both | [A-27](registers.md#a-27), [A-28](registers.md#a-28) |
| <a id="nfr-13"></a>NFR-13 | Availability: fault detection; Testability | Every score is traceable to the data and the classifier version that produced it, and classification anomalies are detectable. | Proxy product manager at Gate 2, 2026-10-14. | Each score carries provider, fetched-at, classifier id and version, and rule-set version; one structured event per ranking; invariant checks (score within range, exactly `WINDOW_DAYS` dated scores per applicable activity, not-applicable carries no score, applicability stable across refreshes) logged as anomalies with a counter. Production path: metrics and alerts, drift checks against the golden set. The classifier version is the same concept as a prompt version, so [NFR-8](#nfr-8) builds on it. | [A-42](registers.md#a-42) |

## Cross-cutting concerns

The brief is silent on these. Each row records what the exercise does and what is left to the production path, so a reviewer can see the concern was weighed either way. Rows that a stakeholder confirmed are routed to the NFR table.

| ID | Concern | In the exercise | Deferred to production |
| --- | --- | --- | --- |
| [A-24](registers.md#a-24) | Expected load | Designed for interactive use: one reviewer, tens of requests per minute, a handful of locations. | A load target; read-heavy traffic on popular cities absorbed by the store and TTL. |
| [A-25](registers.md#a-25) | Scalability | Process kept stateless; single process, single store. Stale-while-revalidate removes the need for a worker. | Horizontal scale as a deployment concern. |
| [A-26](registers.md#a-26) | Authentication, authorisation | None; open on localhost; no user data. | Gateway or JWT at the edge. |
| [A-27](registers.md#a-27) | Rate limiting | Outbound limiter toward Open-Meteo at the fair-use limits ([NFR-9](#nfr-9)). Inbound per-client limiter, configurable, on by default ([NFR-12](#nfr-12)). | Gateway-level inbound limits; distributed limiter if multi-instance. |
| [A-28](registers.md#a-28) | Input validation and security | Every input validated at the API boundary: length, charset, bounds; typed errors; dependencies pinned; introspection on for the reviewer ([NFR-12](#nfr-12)). | Depth and complexity limits; introspection off; dependency scanning. |
| [A-29](registers.md#a-29) | API versioning | Additive schema evolution; deprecations for breaking changes. | Same. |
| [A-30](registers.md#a-30) | Data retention and classifier evaluation | Latest forecast per location only. Classifier outputs (inputs, score, reason) logged as structured events. Each event carries the classifier and rule-set version ([NFR-13](#nfr-13)). | Golden-dataset evaluation outside the running app, fed by the log; matters most for an LLM-assisted classifier. |
| [A-31](registers.md#a-31) | Privacy, PII | Place names only; no identity; no client addresses in logs. | Same. |
| [A-32](registers.md#a-32) | Refresh concurrency | Single-flight per location: in-memory map in A; BullMQ `jobId` deduplication in B and C ([NFR-9](#nfr-9)). | BullMQ deduplication already holds across instances. |
| [A-33](registers.md#a-33) | Backup, recovery | Store treated as a rebuildable cache of upstream data; loss means refetch. | No backups unless history is kept. |
| [A-34](registers.md#a-34) | Store key and invalidation | Forecast stored one key per location, source and date; `SET ... EX RETENTION_TTL` on refresh; stale when `PTTL` is below the freshness threshold; missing when expired or never fetched; the key is provider-neutral. | Same. |
| [A-35](registers.md#a-35) | Deployment target | Local Docker Compose. | Container on EKS via Helm; Terraform for infrastructure ([NFR-10](#nfr-10)). |
| [A-36](registers.md#a-36) | Configuration and secrets | Environment variables; `.env.example` lists every variable; no secrets exist. | Secrets manager. |
| [A-37](registers.md#a-37) | Cost | Zero: free API, local store. | Not estimated; premature until a deployment target is fixed. |
| [A-38](registers.md#a-38) | SLA | None; best effort. | Define once a consumer exists. |
| [A-39](registers.md#a-39) | Supply chain | Lockfile committed; CI installs with a frozen lockfile. | Dependabot and audit in CI. |
| [A-40](registers.md#a-40) | CI/CD | GitHub Actions on every push: lint, type check, tests, image build ([NFR-10](#nfr-10)). | Registry, Helm and EKS deploy steps. |
| [A-41](registers.md#a-41) | Provider neutrality | Provider interface; one adapter per provider; normalised daily signals in the store ([NFR-11](#nfr-11)). | Same. |

## Constraints

| Constraint | Source |
| --- | --- |
| TypeScript on Node.js. | Brief ("Node.js"); recruiter instruction (TypeScript) |
| GraphQL API. | Brief: "Node.js and GraphQL" |
| Open-Meteo is the weather source. | Brief: "Open-Meteo provides the weather data" |
| Weather data is persisted; the API is not called on every request. | Brief: "Persist it rather than calling the API on every request" |
| No front end. | Brief: "please don't build a front end" |
| Public GitHub repository with a short README: what was built, how to run it, assumptions. | Brief: "What to submit" |
| Open-Meteo fair use: under 600 calls per minute, 5,000 per hour, 10,000 per day; CC-BY 4.0 attribution. | Integration points, 1b |
| One evening of build time. | Candidate, stage 0 |

## Quality attribute scenarios

Each scenario traces to a concern above. Every measure is a proposal under the assumption named in the NFR table.

| ID | Attribute | Concern source | Source | Stimulus | Artifact | Environment | Response | Proposed measure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="qas-1"></a>QAS-1 | Performance | [NFR-3](#nfr-3) | API consumer | Queries rankings for a location already in store and fresh | GraphQL API, store | Normal | Rankings computed from stored data | p95 under 300 ms locally; zero upstream calls |
| <a id="qas-2"></a>QAS-2 | Performance | [NFR-3](#nfr-3) | API consumer | Queries a location never seen before | API, ingest, store | Normal, upstream healthy | Geocode, fetch forecast and marine, persist, rank | Under 3 s; at most 3 upstream calls |
| <a id="qas-3"></a>QAS-3 | Availability | [NFR-4](#nfr-4) | Open-Meteo | Times out or returns 5xx | Ingest | Store holds data older than TTL | Serve stored data flagged stale with its fetched-at time | Every request with stored data answered; upstream timeout 2 s; error only when store is empty |
| <a id="qas-4"></a>QAS-4 | Performance | [NFR-1](#nfr-1) | Clock | Stored data passes the TTL | Refresh | Normal | Serve stored data at once with the stale flag; single-flight background refetch; next read fresh | Stale served for at most one request past the TTL; served data never older than TTL plus one refresh cycle; TTL default 6 h, configurable |
| <a id="qas-5"></a>QAS-5 | Usability | [DF-1](#df-1) | API consumer | Queries "Springfield" | Geocoding adapter, API | Normal | Rank the best match; return its name, region, country; list up to 5 alternatives | Resolved location present in every response; alternatives present when more than one match |
| <a id="qas-6"></a>QAS-6 | Usability | [DF-2](#df-2) | API consumer | Queries a name with no match | API | Normal | Typed `NOT_FOUND` error naming the input | No forecast or marine call made; under 1 s |
| <a id="qas-7"></a>QAS-7 | Modifiability | [NFR-7](#nfr-7) | Developer | Adds a fifth activity, for example cycling, that needs wind and rain signals already stored | Classifier registry, API schema | Development | Write one classifier module, register it; the API exposes it | No change to ingest, store, or existing classifiers; existing tests pass unchanged; under 2 hours |
| <a id="qas-8"></a>QAS-8 | Deployability | [NFR-2](#nfr-2) | Operator | Clones the repo and starts the service | Repo, container, store | Clean machine with Docker and Node | Service and store up, health endpoint green, playground reachable | One command; under 2 minutes; no keys or accounts |
| <a id="qas-9"></a>QAS-9 | Testability | [NFR-6](#nfr-6) | CI | Push to any branch | Pipeline | GitHub Actions | Lint, type check, unit, integration, schema and contract, end-to-end; performance smoke test as an optional job | All four gating test levels run; under 5 minutes; zero live calls to Open-Meteo; the performance job reports p95 against the [QAS-1](#qas-1) and [QAS-2](#qas-2) numbers |
| <a id="qas-10"></a>QAS-10 | Usability | [DF-4](#df-4), [DF-3](#df-3) | API consumer | Asks why a day scored as it did | API response | Normal | Factors and inputs available on selection; non-applicable activities carry a reason in `meta`; every ranking event carries them regardless | Selected details present for every score; reason present for every non-applicable or unavailable activity; event always complete |
| <a id="qas-11"></a>QAS-11 | Availability | [NFR-4](#nfr-4), [DF-6](#df-6) | Open-Meteo | Forecast endpoint fails or times out | Ingest, API | No stored data for the location | Bounded wait, then typed `UPSTREAM_UNAVAILABLE` with retry hint; resolved location still returned when geocoding succeeded; marine-only failure degrades surfing only | Under 4.5 s total; no unbounded wait; location present; partial flag set when any source failed |

## 1b — Current Architecture Baseline

Greenfield. There is no current system, so there is no as-is architecture to annotate. The baseline is the environment the service lands in: the upstream integration points and the behaviours they exhibit, verified by probing. Any design must handle these; they are facts, not design.

## Integration points (verified live on 2026-10-14)

| Integration | Finding |
| --- | --- |
| Geocoding | `geocoding-api.open-meteo.com/v1/search?name=…&count=N&language=en` returns up to N matches with name, country, admin1, latitude, longitude, elevation, timezone, population and feature code. Unknown names return no `results` key. "Springfield" returns five US matches, population-ordered. |
| Forecast | `api.open-meteo.com/v1/forecast` with `daily=` supports weather_code, temperature_2m_max/min, precipitation_sum, rain_sum, snowfall_sum (cm), precipitation_probability_max, wind_speed_10m_max, wind_gusts_10m_max, sunshine_duration, daylight_duration, uv_index_max, cloud_cover_mean, visibility_mean. `timezone=auto`; `forecast_days` default 7, maximum 16. Hourly `snow_depth` available. Response carries the grid-cell elevation. |
| Marine | `marine-api.open-meteo.com/v1/marine` with `daily=` supports wave_height_max, wave_period_max, wave_direction_dominant, swell_wave_height_max, swell_wave_period_max. Inland points (Chamonix, Springfield, London) return HTTP 200 with every value `null`. Coastal points (Biarritz, Lisbon) return values. |
| Model updates | Forecast models refresh between every hour and every 6 hours depending on the model. |
| Limits and licence | Non-commercial fair use: fewer than 10,000 calls per day, 5,000 per hour, 600 per minute. No API key. Data under CC-BY 4.0; attribution required. |

## Observed upstream behaviours

| Observed behaviour | Evidence | Handled by |
| --- | --- | --- |
| Inland coordinates: the Marine API returns HTTP 200 with every value `null`, not an error. | Probe 2026-10-14 (Chamonix, Springfield, London) | [DF-3](#df-3) |
| Unknown name: the Geocoding API returns a body with no `results` key. | Probe 2026-10-14 | [DF-2](#df-2) |
| Ambiguous name: the Geocoding API returns several population-ordered matches. | Probe 2026-10-14 ("Springfield", five US matches) | [DF-1](#df-1) |
| Forecast models refresh between every hour and every 6 hours. | Open-Meteo documentation | [NFR-1](#nfr-1) |
| Fair-use limits of 600 per minute, 5,000 per hour, 10,000 per day; no key; CC-BY 4.0. | Open-Meteo terms | [NFR-9](#nfr-9), constraints |
| Outage or timeout of any upstream endpoint. | Not observed; assumed possible | [NFR-4](#nfr-4), [A-19](registers.md#a-19) |


> **Review Gate 1** — passed 2026-10-14. Decisions: outbound and inbound rate limiting from the start; input validation is critical; classifiers and provider integrations are the extension points; LLM use limited to a classifier option where deterministic rules fall short; no invented as-is baseline for greenfield.
