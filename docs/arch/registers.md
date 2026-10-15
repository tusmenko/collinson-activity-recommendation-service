# Living Registers

Part of the [architecture process](../ACTIVITY_RANKING_ARCH_PROCESS.md). Assumptions, open questions, hypotheses and the risk pointer. Updated at every gate; closed at Step 4 except hypotheses, closed at Step 5.

## Assumptions Register

Assumptions are split by who can overturn them: product assumptions a product manager could change, which the README lists; architecture assumptions, each verified by a hypothesis or recorded in an ADR; and exercise scope, the deliberate limits of the exercise with their production path. [A-0](#a-0) frames the whole exercise; the package manager (formerly A-52) is recorded in [DEVELOPMENT.md](../DEVELOPMENT.md#toolchain) and the upstream base URL (formerly A-53) in [D-12](../ACTIVITY_RANKING_DESIGN.md#a-53).

<a id="a-0"></a>**A-0** (confirmed 2026-10-14). "LLM-ops practices" means production practices for an LLM layer. The only LLM use in view is an LLM-assisted classifier for activity suitability where deterministic rules fall short; it is a Step 3 option, never added for show, and follows those practices if built. Confirmed by the candidate at Gate 0.

### Product assumptions

A product manager could overturn these; they are the assumptions the README lists.

| ID | Assumption | Rationale | Status |
| --- | --- | --- | --- |
| <a id="a-5"></a>A-5 | "Next 7 days" means today plus six days in the location's local timezone. | Matches Open-Meteo's default window with `timezone=auto`. See [OQ-7](#oq-7). | confirmed 2026-10-15 by the owner |
| <a id="a-6"></a>A-6 | Scores are rule-based 0–100 per activity per day, with documented thresholds; no ML. | Explainable, testable, fits the time box. See [OQ-2](#oq-2). | deferred: README assumptions list; reviewer may overturn |
| <a id="a-7"></a>A-7 | Output is a score per day per activity from 0 to 100; any ordering is derived by the consumer; there is no separate rank field. | Reads the brief literally and no further; the earlier rank field was judged invented at the Gate 4 review. | confirmed 2026-10-14 |
| <a id="a-8"></a>A-8 | Skiing uses the queried location's own forecast; no search for a nearby resort. A place below 800 m (the geocoding elevation), or with no known elevation, is not applicable for skiing; above it, low or absent snow signal marks skiing not applicable rather than inventing data. | Nearby-resort lookup is a product feature outside the brief. See [OQ-3](#oq-3). The owner set the 800 m gate on 2026-10-15: ski terrain starts around there, so valley towns such as Chamonix (1060 m) qualify and London (25 m) does not. Probe 2026-10-14: Open-Meteo's `elevation` parameter shifts a forecast by lapse rate, so resort elevation can become a location fact later. | confirmed 2026-10-15 by the owner, with the elevation gate |
| <a id="a-9"></a>A-9 | Surfing is NOT_APPLICABLE where the Marine API returns nulls. Where it returns values, including lakes and lagoons, surfing is APPLICABLE and the wave height and period thresholds decide the score, so a lagoon scores near zero with an explicit reason. No nearest-coast search. | Same reasoning as [A-8](#a-8). See [OQ-4](#oq-4). | confirmed 2026-10-14 after the [H-3](#h-3) probe; confirmed 2026-10-15 by the owner |
| <a id="a-10"></a>A-10 | Ambiguous names resolve to Open-Meteo's first result; alternatives are returned; an optional country filter is accepted. The first result whose name equals the query case-insensitively is preferred over a fuzzy first hit ([H-6](#h-6): Victoria versus Vitória). | Population-ordered first hit matches user expectation most of the time; alternatives keep it honest. See [OQ-5](#oq-5). | confirmed 2026-10-14 after the [H-6](#h-6) probe, caveats logged; confirmed 2026-10-15 by the owner |
| <a id="a-11"></a>A-11 | Refresh TTL defaults to 6 hours, configurable. | Follows the provider's update cadence: Open-Meteo models update every 1 to 6 hours, so 6 h matches the slowest refresh; a 7-day outlook changes slowly. See [OQ-6](#oq-6). | confirmed 2026-10-15 by the owner |
| <a id="a-12"></a>A-12 | Metric units; English place names. | Open-Meteo defaults; brief is silent. See [OQ-8](#oq-8), [OQ-10](#oq-10). | deferred: README assumptions list; reviewer may overturn |
| <a id="a-13"></a>A-13 | Indoor sightseeing is always acceptable and scores higher when outdoor conditions are poor. | Reasonable reading of the activity; cheap to overturn. See [OQ-12](#oq-12). | deferred: README assumptions list; reviewer may overturn |
| <a id="a-14"></a>A-14 | An unknown place name returns a typed not-found error rather than an empty result. | Derived behaviour [DF-2](02-requirements.md#df-2); brief is silent. | confirmed 2026-10-15 by the owner |
| <a id="a-15"></a>A-15 | Each score's factors and inputs are available on selection and always recorded in the ranking event; they are not in the default response. | Derived behaviour [DF-4](02-requirements.md#df-4); serves the usability concern of score transparency. | confirmed 2026-10-14 |
| <a id="a-16"></a>A-16 | Each response carries the fetched-at time of the data it used. | Derived behaviour [DF-5](02-requirements.md#df-5); follows from persist-and-refresh. | deferred: README assumptions list; reviewer may overturn |
| <a id="a-50"></a>A-50 | Skiing applicability is gated on the daily maximum of hourly `snow_depth` from the forecast model; fresh snowfall is a bonus, not the gate. Known false negative: some glacier cells carry no model snow (Sölden, 0 m at 3340 m on 2026-10-14), so an open glacier can be reported not applicable. | Probed 2026-10-14 at Hintertux (0.39 m), Chamonix (0) and Sölden (0). Resort elevation and snow facts are enrichment on the [ASR-5](03-asrs.md#asr-5) seam. | confirmed 2026-10-14 |
| <a id="a-51"></a>A-51 | A stale or missing read waits for one single-flight refetch under `COLD_READ_BOUND_MS` and returns fresh data; the stale flag is set only when the refetch failed and stored data is served instead. | Decided at the Gate 4 review on 2026-10-15 after S-5 refuted incremental delivery; one code path for cold and stale reads. | confirmed 2026-10-15 |

### Architecture assumptions

Verified by a hypothesis or recorded in an ADR.

| ID | Assumption | Verified by | Status |
| --- | --- | --- | --- |
| <a id="a-1"></a>A-1 | Open-Meteo behaviour verified on 2026-10-14 (variables, null marine data inland, limits) stays valid for the exercise. | Step 1 probes ([integration points](02-requirements.md#integration-points-verified-live-on-2026-10-14)), [H-3](#h-3), [H-6](#h-6) | confirmed 2026-10-14 |
| <a id="a-18"></a>A-18 | Warm read p95 under 300 ms with zero upstream calls; cold read under 3 s with at most three calls. | [H-5](#h-5) | verified 2026-10-15 ([H-5](#h-5)): warm p95 31.8 ms, cold read 143 ms on the load job |
| <a id="a-19"></a>A-19 | On upstream failure, stale stored data is served with a flag; upstream timeout 2 s with one retry; with an empty store the answer is a typed `UPSTREAM_UNAVAILABLE` with a retry hint and the resolved location; marine-only failure degrades surfing only and flags the response partial. | [ADR-0006](../adr/0006-degradation-policy.md) | deferred: README assumptions list; reviewer may overturn |
| <a id="a-23"></a>A-23 | Suitability for the four activities in scope is computable from weather and geo data alone; no points-of-interest enrichment is needed. | [H-1](#h-1) | verified 2026-10-15 on the golden set ([H-1](#h-1)); the reviewer may still overturn the thresholds |
| <a id="a-34"></a>A-34 | Forecast stored one key per location, source and date; `SET ... EX RETENTION_TTL` on refresh; stale when `PTTL` is below the freshness threshold; missing when expired or never fetched; the key is provider-neutral. | [ADR-0002](../adr/0002-redis-only-store.md) | deferred: README assumptions list; reviewer may overturn |
| <a id="a-41"></a>A-41 | Provider interface; one adapter per provider; normalised daily signals in the store ([NFR-11](02-requirements.md#nfr-11)). Payloads are validated against a pinned provider schema version; drift is an anomaly. | [ADR-0005](../adr/0005-provider-neutral-signals-behind-ports.md) | confirmed 2026-10-14 |
| <a id="a-42"></a>A-42 | Every score carries provider, fetched-at, classifier id and version, and rule-set version; one structured event per ranking; invariant checks log anomalies with a counter. | [ADR-0008](../adr/0008-traceability-events-invariants.md) | confirmed 2026-10-14 |
| <a id="a-43"></a>A-43 | The data model has two storage classes from day one, a forecast cache (TTL, window-keyed) and long-lived location facts of which the geocoding result is the first; they are namespaces with different TTL policy, not necessarily different engines. | [ADR-0002](../adr/0002-redis-only-store.md) | confirmed 2026-10-14 |
| <a id="a-46"></a>A-46 | Hardcoded JSON thresholds per classifier are acceptable; they are read through a `RuleSetProvider` interface so a configuration-service or database source can replace the file without touching classifiers. | [ADR-0004](../adr/0004-scores-on-read-registered-classifiers.md) | confirmed 2026-10-14 |
| <a id="a-47"></a>A-47 | Redis with AOF persistence is the only store for the exercise, holding both storage classes behind repository interfaces; PostgreSQL is the target-state store for facts once enrichment makes them relational. | [ADR-0002](../adr/0002-redis-only-store.md) | confirmed 2026-10-14 |
| <a id="a-48"></a>A-48 | Partial requests are supported: each classifier declares the sources it requires, the ingest runs the union for the requested activities, and the store is per source. | [ADR-0004](../adr/0004-scores-on-read-registered-classifiers.md) | confirmed 2026-10-14 |
| <a id="a-49"></a>A-49 | One key per location, source and date with `RETENTION_TTL` 24 h as the Redis TTL; `FRESHNESS_TTL` 6 h applied as a `PTTL` threshold marks data stale; a missing key is a miss. No value parsing for freshness or coverage. | [ADR-0002](../adr/0002-redis-only-store.md) | confirmed 2026-10-14 |

### Exercise scope

Deliberate limits of the exercise rather than assumptions; for A-24 to A-40 the production path repeats the [cross-cutting table](02-requirements.md#cross-cutting-concerns).

| ID | Scope | Production path |
| --- | --- | --- |
| <a id="a-2"></a>A-2 | The reviewer's machine has Docker and a current Node LTS. | Not needed; CI and the cluster provide the runtime. |
| <a id="a-3"></a>A-3 | The API needs no authentication for the exercise. | Gateway or JWT at the edge ([A-26](#a-26)). |
| <a id="a-4"></a>A-4 | A single process with a local store is acceptable for the exercise; horizontal scale is a production-path note. | Horizontal scale through the Helm HPA and a worker Deployment ([ADR-0009](../adr/0009-delivery-compose-helm-actions.md)). |
| <a id="a-17"></a>A-17 | One-command start on a clean clone, under 2 minutes, no key or account, is the deployability bar. | Image to ECR and `helm upgrade` to EKS from CI ([ADR-0009](../adr/0009-delivery-compose-helm-actions.md)). |
| <a id="a-20"></a>A-20 | Logging each upstream call and refresh, plus a health endpoint, is enough observability for the exercise. | OTLP to Datadog; dashboards; alerts on the anomaly counter. |
| <a id="a-21"></a>A-21 | The testing bar is the full pyramid without the live upstream: unit, integration on recorded fixtures, schema and contract, one end-to-end query with a stubbed upstream, all in CI on every push. A performance smoke test verifies the warm and cold read numbers; it is optional in CI for the exercise and a scheduled gate on the production path. | Load job as a scheduled gate; Pact consumer contract; optional live contract job. |
| <a id="a-22"></a>A-22 | Adding an activity means one new classifier module plus registration, with no change to ingest, store, API, or existing classifiers. | Same. |
| <a id="a-24"></a>A-24 | Designed for interactive use: one reviewer, tens of requests per minute, a handful of locations. | A load target; read-heavy traffic on popular cities absorbed by the store and TTL. |
| <a id="a-25"></a>A-25 | Process kept stateless; single process, single store. | Horizontal scale as a deployment concern. |
| <a id="a-26"></a>A-26 | None; open on localhost; no user data. | Gateway or JWT at the edge. |
| <a id="a-27"></a>A-27 | Outbound limiter toward Open-Meteo at the fair-use limits ([NFR-9](02-requirements.md#nfr-9)). Inbound per-client limiter, configurable, on by default ([NFR-12](02-requirements.md#nfr-12)). | Gateway-level inbound limits; distributed limiter if multi-instance. |
| <a id="a-28"></a>A-28 | Every input validated at the API boundary: length, charset, bounds; typed errors; dependencies pinned; introspection on for the reviewer ([NFR-12](02-requirements.md#nfr-12)). | Depth and complexity limits; introspection off; dependency scanning. |
| <a id="a-29"></a>A-29 | Additive schema evolution; deprecations for breaking changes. | Same. |
| <a id="a-30"></a>A-30 | Latest forecast per location only. Classifier outputs (inputs, score, reason) logged as structured events. Each event carries the classifier and rule-set version ([NFR-13](02-requirements.md#nfr-13)). | Golden-dataset evaluation outside the running app, fed by the log. |
| <a id="a-31"></a>A-31 | Place names only; no identity; no client addresses in logs. | Same. |
| <a id="a-32"></a>A-32 | Single-flight per location: in-memory map in A; BullMQ `jobId` deduplication in B and C ([NFR-9](02-requirements.md#nfr-9)). | BullMQ deduplication already holds across instances. |
| <a id="a-33"></a>A-33 | Store treated as a rebuildable cache of upstream data; loss means refetch. | No backups unless history is kept. |
| <a id="a-35"></a>A-35 | Local Docker Compose. | Container on EKS via Helm; Terraform for infrastructure. |
| <a id="a-36"></a>A-36 | Environment variables; `.env.example` lists every variable; no secrets exist. | Secrets manager. |
| <a id="a-37"></a>A-37 | Zero: free API, local store. | Not estimated; premature until a deployment target is fixed. |
| <a id="a-38"></a>A-38 | None; best effort. | Define once a consumer exists. |
| <a id="a-39"></a>A-39 | Lockfile committed; CI installs with a frozen lockfile. | Dependabot and audit in CI. |
| <a id="a-40"></a>A-40 | GitHub Actions on every push: lint, type check, tests, image build ([NFR-10](02-requirements.md#nfr-10)). | Registry, Helm and EKS deploy steps. |
| <a id="a-44"></a>A-44 | Evaluating indoor and outdoor attractions (points of interest, museums, walkability) is out of scope; suitability uses weather and geo data only. Adding attractions needs a new data-collection pipeline on the [ASR-5](03-asrs.md#asr-5) seam. | A data-collection pipeline on the [ASR-5](03-asrs.md#asr-5) seam; proof of concept [H-2](#h-2). |
| <a id="a-45"></a>A-45 | One stale response per TTL expiry, flagged, while revalidation runs in the background, is acceptable. | — (withdrawn 2026-10-15, replaced by [A-51](#a-51); kept for the record) |

## Open Questions Log

Questions a product manager would answer. Each carries the assumption chosen so the work can proceed.

| ID | Question | Assumption taken | Owner | Status |
| --- | --- | --- | --- | --- |
| <a id="oq-1"></a>OQ-1 | Rank days per activity, or rank activities per day? Traces to [FR-4](02-requirements.md#fr-4). | Per activity across days; per-day view derivable ([A-7](#a-7)). | Product manager | open, assumption in force; owner: the lead reviewer, at review |
| <a id="oq-2"></a>OQ-2 | What makes a day "good" for each activity? Thresholds? | Rule-based heuristics with documented thresholds ([A-6](#a-6)); exact rules fixed in Step 5. | Product manager | open, a product decision; the owner keeps the default thresholds ([D-6.1](../ACTIVITY_RANKING_DESIGN.md#d-6)) on 2026-10-15 |
| <a id="oq-3"></a>OQ-3 | Skiing for a city with no mountains (London)? | Score from the city's own forecast; not applicable below 800 m elevation, and not applicable when no snow signal ([A-8](#a-8)). | Product manager | resolved 2026-10-15 by the owner: elevation gate at 800 m plus the snow-depth gate |
| <a id="oq-4"></a>OQ-4 | Surfing for an inland city? | Not applicable, with the reason ([A-9](#a-9)). | Product manager | resolved 2026-10-15 by the owner: not applicable inland |
| <a id="oq-5"></a>OQ-5 | How to resolve an ambiguous name? | First result plus alternatives; optional country filter ([A-10](#a-10)). | Product manager | resolved 2026-10-15 by the owner: agreed |
| <a id="oq-6"></a>OQ-6 | How fresh must data be? | TTL 6 h, configurable ([A-11](#a-11)). | Product manager, Operator | resolved 2026-10-15 by the owner: follow the provider's update cadence; 6 h matches the slowest Open-Meteo model refresh (models update every 1 to 6 hours), so the default stands |
| <a id="oq-7"></a>OQ-7 | Does "next 7 days" include today? Traces to [FR-2](02-requirements.md#fr-2). | Yes, in local time ([A-5](#a-5)). | Product manager | resolved 2026-10-15 by the owner: yes, today included, local time |
| <a id="oq-8"></a>OQ-8 | Units? | Metric ([A-12](#a-12)). | Product manager | open, assumption in force; owner: the lead reviewer, at review |
| <a id="oq-9"></a>OQ-9 | Refresh on read, or background job for known locations? | Refresh on read, blocking under the cold-read bound with single-flight; no scheduled refresh (Gate 3); stale-while-revalidate withdrawn at the Gate 4 review ([A-51](#a-51)). | Operator | resolved 2026-10-15 |
| <a id="oq-10"></a>OQ-10 | Non-English place names? | English geocoding only ([A-12](#a-12)). | Product manager | open, assumption in force; owner: the lead reviewer, at review |
| <a id="oq-11"></a>OQ-11 | Which store? | Redis with AOF persistence ([A-47](#a-47)); PostgreSQL on the target state for facts. | Candidate | resolved 2026-10-14 |
| <a id="oq-12"></a>OQ-12 | Should indoor sightseeing ever score low, for example on a perfect outdoor day, or is it always at least acceptable? | Never bad; better when outdoors is worse ([A-13](#a-13)). | Product manager | open, assumption in force; owner: the lead reviewer, at review |
| <a id="oq-13"></a>OQ-13 | What should an unknown place name return? | Typed not-found error ([A-14](#a-14)). | Product manager | resolved 2026-10-15 by the owner: yes, typed not-found error |
| <a id="oq-14"></a>OQ-14 | Should the API expose why a day scored as it did? | Yes, inputs and a reason per score ([A-15](#a-15)). | Product manager | open, assumption in force; owner: the lead reviewer, at review |
| <a id="oq-15"></a>OQ-15 | Should the consumer see how old the data is? | Yes, fetched-at per response ([A-16](#a-16)). | Product manager | open, assumption in force; owner: the lead reviewer, at review |
| <a id="oq-16"></a>OQ-16 | Is activity suitability computable from weather and geo data alone, or does it need enrichment (for example points of interest from the web) and a classifier that is not deterministic? | Weather and geo only for the four activities in scope ([A-23](#a-23)). An LLM-assisted classifier with enrichment is a Step 3 option. | Product manager | open, needs POC ([H-1](#h-1)); owner: the lead reviewer, at review |
| <a id="oq-17"></a>OQ-17 | Which of the cross-cutting concerns [A-24](#a-24) to [A-41](#a-41) must move from the production-path column into scope for a first production release? | None beyond what the exercise already does. | Product manager | open, assumption in force; owner: the lead reviewer, at review |
| <a id="oq-18"></a>OQ-18 | Is there point-of-interest geodata for sightseeing suitability, and if so from which source: a deterministic one (OpenStreetMap Overpass, Wikidata) or LLM enrichment? | Weather and geo only for the exercise ([A-23](#a-23)). The data model separates location facts from the forecast cache so either enrichment path lands without a migration ([A-43](#a-43)). A proof of concept is deferred and logged as a risk in Step 3. | Product manager | open, needs POC ([H-2](#h-2)); owner: the lead reviewer, at review |

## Quality Attribute Scenarios

Recorded in [02-requirements.md](02-requirements.md); refined in Step 2.

## Utility Tree

Recorded in [03-asrs.md](03-asrs.md); closed at Step 3.

## Hypotheses to Verify

Assumptions that can be tested cheaply are not decided ad hoc; they are listed here with a verification method and a time. Started at Step 2, updated through Step 5, closed at Step 5. Anything still unverified at submission goes into the README as "what I would verify next".

| ID | Hypothesis | Linked | Verification | When | Status |
| --- | --- | --- | --- | --- | --- |
| <a id="h-1"></a>H-1 | Suitability for the four activities is computable from weather and geo data alone. | [A-23](#a-23), [OQ-16](#oq-16) | Golden set of five known cities and seasons (Chamonix in January, Biarritz in autumn, London in November, Dubai in July, Springfield, Missouri), recorded as real days from the Open-Meteo archive endpoint; scores match expectation. | Implementation, Step 5 | closed 2026-10-15 in phase 3: golden set holds (Chamonix January skiing 88 on 10 January; Hintertux applicable, Chamonix October not; Biarritz surfing 93 to 100; Dubai surfing 7 to 14 and indoor 40 over outdoor 30; Springfield day 1 indoor 63 over outdoor 30; London rain day indoor 44 over outdoor 30) after two threshold adjustments recorded in [D-6.1](../ACTIVITY_RANKING_DESIGN.md#d-61-provisional-thresholds): a deal-breaker cap and a wider skiing snow-depth poor band. Weather and geo data suffice for the five cities; attractions remain [H-2](#h-2) |
| <a id="h-2"></a>H-2 | Point-of-interest geodata for sightseeing is available from a deterministic source. | [OQ-18](#oq-18) | Spike: Overpass query for POI counts in three cities; latency, licence (ODbL), coverage. | Post-exercise proof of concept | deferred: post-exercise POC |
| <a id="h-3"></a>H-3 | Marine API nulls reliably mean "no surf" at this location. | [A-9](#a-9), [DF-3](02-requirements.md#df-3) | Probe lake and estuary cities (Chicago, Toronto, Hamburg, Seattle) for nulls versus values. | Step 5 spike, cheap | refuted in part 2026-10-14: nulls do mean no data (Hamburg, Elbe estuary); lakes and lagoons return values (Chicago 0.7 m, Toronto 0.2 to 0.9 m, Seattle 0.1 m, Venice 0.08 m); the grid snaps to the nearest water cell 10 to 15 km away |
| <a id="h-4"></a>H-4 | A 6 h TTL loses nothing against model update cadence. | [A-11](#a-11) | Fetch one city hourly for 6 h; compare daily values; churn stays below one score band. | Post-exercise | deferred: post-exercise |
| <a id="h-5"></a>H-5 | Warm read p95 under 300 ms is achievable with the chosen store. | [A-18](#a-18) | Performance smoke test from [NFR-6](02-requirements.md#nfr-6). | Implementation | verified 2026-10-14 (S-4): p95 at most 3 ms on loopback at 50 connections; the phase 4 smoke test re-checks it inside the real service. Measured 2026-10-15 in phase 5 by the load job against the composed `demo` profile: warm p95 31.8 ms at 50 connections for 10 s (19,265 requests, zero 5xx), cold read 143 ms |
| <a id="h-6"></a>H-6 | The first geocoding result is the expected place for common names. | [A-10](#a-10) | Spot-check ten ambiguous names against expectation. | Step 5 spike, cheap | verified with caveats 2026-10-14: 7 of 10 as expected; misses Victoria (fuzzy match to Vitória, Brazil), Newcastle (Australia), Georgetown (Guyana); exact-name preference rule added, alternatives and country filter cover the rest |
| <a id="h-7"></a>H-7 | `@defer` incremental delivery works under the NestJS Apollo driver with the graphql-js version available. | Step 5 tier 2 | Spike: one deferred field on a throwaway schema; check the multipart response. | Step 5 spike, before tier 2 | refuted 2026-10-14 (S-5): works only with graphql pinned to `17.0.0-alpha.9` outside Apollo 5's peer range, a Nest schema workaround and the `incrementalSpec=v0.2` header; tier 2 dropped |
| <a id="h-8"></a>H-8 | The Option C toolchain works together in the time box: Vitest with Nest decorators, `nestjs-zod` on code-first GraphQL arguments, BullMQ `waitUntilFinished` with job-id deduplication and `removeOnComplete`. | [R-1](04-options.md#r-1), [ADR-0001](../adr/0001-pragmatic-option-nestjs-redis-bullmq.md) | Spikes S-1 to S-3 in [Step 4](05-recommendation.md#spikes-before-sign-off); each has a named fallback. | Before Gate 4 | verified 2026-10-14: S-1, S-2, S-3 passed (Vitest with decorators; Zod via a custom pipe, `nestjs-zod` dropped; BullMQ pattern holds with job ids using `__`) |

## Risk Register (pointer)

Recorded in [04-options.md](04-options.md#risk-register); statuses set at Step 4.
