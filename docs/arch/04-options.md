# Step 3 — Solution Options

Part of the [architecture process](../ACTIVITY_RANKING_ARCH_PROCESS.md). Requirement and scenario IDs are defined in [02-requirements.md](02-requirements.md), ASRs in [03-asrs.md](03-asrs.md), registers in [registers.md](registers.md). Mechanisms referenced as D-n are specified in the [design document](../ACTIVITY_RANKING_DESIGN.md).

## Shared ground

All three options share the seam fixed by [ASR-1](03-asrs.md#asr-1), [ASR-2](03-asrs.md#asr-2) and [ASR-5](03-asrs.md#asr-5) (classifier registry, one adapter per provider, normalised daily signals, two storage namespaces) and the framework: NestJS, whose modules map onto the requirements without custom plumbing.

| NestJS piece | Covers |
| --- | --- |
| GraphQL code-first, Apollo driver | [FR-4](02-requirements.md#fr-4) schema; `Activity` enum generated from the registry ([R-8](#r-8)) |
| Dependency injection, modules | [ASR-1](03-asrs.md#asr-1) registry, [ASR-2](03-asrs.md#asr-2) adapters, [ASR-5](03-asrs.md#asr-5) facts versus cache |
| Zod with a ten-line `PipeTransform` | [NFR-12](02-requirements.md#nfr-12) argument validation with `BAD_USER_INPUT`; [NFR-11](02-requirements.md#nfr-11) payload validation; config validation; types inferred from the schemas. `nestjs-zod` dropped after S-2: peer conflict with Nest 12 and maps failures to `BAD_REQUEST` |
| ThrottlerModule | [NFR-12](02-requirements.md#nfr-12) inbound limiter; in-memory storage in A, Redis storage in B and C |
| BullMQ (`@nestjs/bullmq` at this step; the build uses plain `bullmq` providers, [D-12](../ACTIVITY_RANKING_DESIGN.md#d-12)) | [ASR-3](03-asrs.md#asr-3) ingest execution in B and C: durable jobs, job-id deduplication, queue limiter, retries, lifecycle events; `enrich` queue as the [ASR-5](03-asrs.md#asr-5) attachment point |
| Terminus | [NFR-5](02-requirements.md#nfr-5) health endpoint (`/health` with Redis and memory indicators, Kubernetes probe format) |
| ConfigModule | [A-36](registers.md#a-36) environment configuration |
| pino, OpenTelemetry SDK | [NFR-5](02-requirements.md#nfr-5) logs; [NFR-13](02-requirements.md#nfr-13) ranking events and anomaly counter |
| Vitest | [NFR-6](02-requirements.md#nfr-6) testing pyramid; end-to-end over native `fetch`. Nest CLI 12 scaffolds Vitest and ESM by default (S-1); Jest is the swap if asked |
| ioredis behind repository interfaces | [ASR-2](03-asrs.md#asr-2), [ASR-5](03-asrs.md#asr-5) storage; throttler storage; daily fair-use counter |

Decisions common to all options. One line each; the mechanism is in the design document.

| Decision | Summary | Design |
| --- | --- | --- |
| Refresh on read, single-flight | A stale or missing read waits for one refetch under the cold-read bound and gets fresh data; every caller in that window waits on the same job. If the refetch fails, stored data is served flagged stale. Scheduled refresh rejected at Gate 3: it refetches what nobody asks for. Stale-while-revalidate was chosen at Gate 3 and withdrawn at the Gate 4 review once `@defer` (S-5, [H-7](registers.md#h-7)) proved unusable: a stale answer plus a client re-query is poor consumer experience. | [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4), [D-5](../ACTIVITY_RANKING_DESIGN.md#d-5) |
| Compute on read | The store holds signals only; classifiers change without re-scoring; 28 classifier calls per read. | [D-6](../ACTIVITY_RANKING_DESIGN.md#d-6) |
| Pinned upstream schema | Payloads validated at the adapter against a versioned schema; raw snapshot kept; a failure is an anomaly event and takes the degradation path ([R-9](#r-9)). | [D-5](../ACTIVITY_RANKING_DESIGN.md#d-5), [D-7](../ACTIVITY_RANKING_DESIGN.md#d-7) |
| Ingest as a pipeline | One job per location and source (job id `{locationId}__{source}`, S-3); forecast mandatory, marine optional; enrichment is a second queue. | [D-5](../ACTIVITY_RANKING_DESIGN.md#d-5) |
| Redis only | A TTL cache plus small facts needs no SQL yet; PostgreSQL is the target for facts once enrichment makes them relational; MongoDB rejected. | [D-4](../ACTIVITY_RANKING_DESIGN.md#d-4) |
| Thresholds in JSON | Behind a `RuleSetProvider` that exports `ruleSetVersion`. | [D-6](../ACTIVITY_RANKING_DESIGN.md#d-6) |

## Options

| | A — Incremental | B — Target state | C — Pragmatic |
| --- | --- | --- | --- |
| Runtime | One NestJS process | API deployment on EKS with horizontal pod autoscaling; a worker deployment runs the queue processors | One NestJS image; queue processors in the same process behind a role flag |
| Platform | Docker Compose: api, redis | EKS via a Helm chart; Terraform for VPC, EKS, ElastiCache, ECR, and Aurora once facts need it | Docker Compose: api, redis; Helm chart skeleton committed, not deployed; Terraform described in the README |
| Store | Redis with AOF, two namespaces, behind repository interfaces | ElastiCache for cache and facts; Aurora PostgreSQL for facts when enrichment lands | Redis with AOF, same as A |
| Redis uses | Store only; limiter, single-flight and throttler storage in-process | Store, BullMQ queues, throttler storage, daily fair-use counter | Same as B |
| Refresh ([ASR-3](03-asrs.md#asr-3)) | Refresh on read; in-request pipeline with in-memory single-flight | Refresh on read; BullMQ `ingest` jobs awaited under the bound; `enrich` queue with a processor | Refresh on read; BullMQ `ingest` jobs awaited under the bound; `enrich` queue registered, no processor |
| Degradation ([ASR-4](03-asrs.md#asr-4)) | Store-first, 2 s timeout, one retry, partial response | Same, plus a circuit breaker per upstream | Same as A |
| Observability ([NFR-5](02-requirements.md#nfr-5)) | pino JSON logs, Terminus health | OpenTelemetry to Datadog, dashboards, alerts on the anomaly counter | pino, OpenTelemetry SDK with console or OTLP exporter, anomaly counter metric |
| Traceability ([NFR-13](02-requirements.md#nfr-13)) | Ranking event with versions; invariant checks | Same, plus a drift job against the golden set | Same as A, plus the counter as a metric |
| CI/CD ([NFR-10](02-requirements.md#nfr-10)) | GitHub Actions: lint, type check, Vitest with a redis service, image build | Adds push to ECR and `helm upgrade` | Adds `helm lint` |
| Stack shown | TypeScript, NestJS, GraphQL, Redis, Vitest, GitHub Actions, Docker | Adds Kubernetes, Helm, Terraform, ElastiCache, Aurora, Datadog; Lambda and SQS as the serverless variant | Adds BullMQ, a Helm chart, OpenTelemetry |
| Effort | About 2.5 hours | Two to three days | About 4.5 hours, phased so each phase leaves a working service |
| Ceiling | Single instance | Horizontal scale | Single instance now; every Redis-backed piece already holds across instances |

## Coverage matrix

Mechanism common to all options, then the option that differs.

| Requirement | Mechanism | Differs |
| --- | --- | --- |
| [FR-1](02-requirements.md#fr-1) resolve place | Geocoding adapter writes a location fact | — |
| [FR-2](02-requirements.md#fr-2) seven days | Forecast adapter requests `FETCH_DAYS` days; one key per location, source and date; the read is one `MGET` over the window | — |
| [FR-3](02-requirements.md#fr-3) four activities | Four classifiers registered | — |
| [FR-4](02-requirements.md#fr-4) rank per activity | A 0 to 100 score per day per classifier in date order; no rank field, ordering is the consumer's | — |
| [DF-1](02-requirements.md#df-1) ambiguity | Geocode with count 5; exact-name match preferred, else first result; alternatives returned | — |
| [DF-2](02-requirements.md#df-2) unknown | No results maps to a `NOT_FOUND` GraphQL error via an exception filter | — |
| [DF-3](02-requirements.md#df-3) not applicable | Status and reason in the classifier output | — |
| [DF-4](02-requirements.md#df-4) inputs and factors | Resolved only when selected; always in the ranking event | — |
| [DF-5](02-requirements.md#df-5) data age | fetched-at and stale flag on every response | — |
| [DF-6](02-requirements.md#df-6) per-source failure | Partial flag; marine failure degrades surfing to unavailable | — |
| [DF-7](02-requirements.md#df-7) partial requests | Classifiers declare required sources; ingest runs the union; store is per source | — |
| [NFR-1](02-requirements.md#nfr-1) timeliness | `RETENTION_TTL` as key TTL, `FRESHNESS_TTL` as `PTTL` threshold; a missing or stale key means wait for one refetch | A: in-process single-flight; B, C: BullMQ job-id deduplication |
| [NFR-2](02-requirements.md#nfr-2), [NFR-3](02-requirements.md#nfr-3) performance | Store-first read; one `MGET` per required source | — |
| [NFR-4](02-requirements.md#nfr-4) availability | Adapter timeouts, one retry, exception filter, partial response | B adds a circuit breaker |
| [NFR-5](02-requirements.md#nfr-5) fault detection | pino, Terminus, OpenTelemetry | Exporter target differs |
| [NFR-6](02-requirements.md#nfr-6) testability | Vitest unit; integration against a redis service; schema snapshot; end-to-end over `fetch` with stubbed adapters; autocannon smoke test | — |
| [NFR-7](02-requirements.md#nfr-7) extensibility | Classifier module plus one registry entry; enum from registry | — |
| [NFR-8](02-requirements.md#nfr-8) LLM-ops | Not built; classifier contract is async-capable | — |
| [NFR-9](02-requirements.md#nfr-9) upstream access | Outbound limiter and single-flight | A: in-memory token bucket and map; B, C: BullMQ queue limiter plus a daily Redis counter, job-id deduplication |
| [NFR-10](02-requirements.md#nfr-10) deployability | Dockerfile, Compose, GitHub Actions | C Helm skeleton; B full Helm and Terraform |
| [NFR-11](02-requirements.md#nfr-11) provider neutrality | Adapter interface; zod-validated payload pinned to a schema version; raw snapshot stored; versioned key prefix, drift means refetch | — |
| [NFR-12](02-requirements.md#nfr-12) security | Zod on arguments via `nestjs-zod`; ThrottlerModule; complexity limit of five locations per query | Throttler storage in-memory in A |
| [NFR-13](02-requirements.md#nfr-13) traceability | Ranking event with provider, fetched-at, classifier and rule-set versions; invariant checks; anomaly counter | B adds alerts and a drift job |

## ASR coverage

| Requirement | A | B | C |
| --- | --- | --- | --- |
| [ASR-1](03-asrs.md#asr-1) Classifier contract and registry | satisfies | satisfies | satisfies |
| [ASR-2](03-asrs.md#asr-2) Provider-neutral signal model | satisfies | satisfies | satisfies |
| [ASR-3](03-asrs.md#asr-3) Refresh under fair use | satisfies on one instance only | satisfies | satisfies |
| [ASR-4](03-asrs.md#asr-4) Degradation on upstream failure | satisfies | satisfies | satisfies |
| [ASR-5](03-asrs.md#asr-5) Location facts and enrichment seam | satisfies | satisfies | satisfies |
| Goal 5 company stack shown | partial | satisfies | satisfies in code; Kubernetes and Terraform as a described path |
| Goal 3 focus and the one-evening box | satisfies | does not satisfy | satisfies only if phased with cut lines |

## Sensitivity and tradeoff points

ATAM terms. A sensitivity point is one decision whose value strongly moves one quality attribute. A tradeoff point is a decision that moves two or more attributes in opposite directions. Both come from walking each option against the scenarios.

| Decision | Moves | Direction | Type |
| --- | --- | --- | --- |
| `RETENTION_TTL` | Availability under outage; freshness of what can be served | Longer retention: availability up, worst-case staleness up | tradeoff |
| Single-flight and limiter placement (process versus Redis) | Availability of upstream access under more than one instance | Redis: correct under scale; in-process: wrong under scale | sensitivity |
| Compute on read | Modifiability; per-read latency | Modifiability up; 28 classifier calls per read | tradeoff, negligible cost |
| Pinned upstream schema | Availability and traceability under upstream change; fixture maintenance | Safer under drift; fixtures must track the version | tradeoff |
| BullMQ for ingest | Durability of revalidation; test complexity | Durable and deduplicated; queue lifecycle in integration tests | tradeoff |
| Redis as the only store | Deployability; durability and growth of facts | One container to run; facts rest on AOF and stay non-relational | tradeoff |
| `FETCH_DAYS = WINDOW_DAYS + 1` | Freshness across local midnight | One extra day per fetch removes the midnight miss | sensitivity |

## Tradeoff analysis

One row per choice. "Serves" names the requirements the choice addresses. Preferences are tactic-level; the option selection is Step 4.

| Axis | Choice | Pros | Cons | Serves | Preferred |
| --- | --- | --- | --- | --- | --- |
| Refresh | Blocking single-flight refetch when stale | Simple; always fresh on the normal path; one code path for cold and stale; the stale flag means only "upstream failed" | Callers wait one upstream round trip once per expiry per location and source | [NFR-1](02-requirements.md#nfr-1), [NFR-4](02-requirements.md#nfr-4); [ASR-3](03-asrs.md#asr-3), [ASR-4](03-asrs.md#asr-4) | yes, Gate 4 review |
| Refresh | Stale-while-revalidate | Warm latency always; fair-use friendly | One stale response per expiry that the client must re-query to replace, with no incremental delivery available (S-5) | [NFR-2](02-requirements.md#nfr-2), [NFR-3](02-requirements.md#nfr-3) | no, withdrawn at Gate 4 review |
| Refresh | Scheduled refresh of known locations | Never stale | Refetches locations nobody asks for; queue and worker; burns fair use | [NFR-1](02-requirements.md#nfr-1) | no, rejected at Gate 3 |
| Refresh | Incremental delivery (`@defer`) | Cached then fresh in one response | Works only with graphql pinned to `17.0.0-alpha.9`, outside Apollo 5's peer range, plus a schema workaround and a new Accept header (S-5) | [NFR-1](02-requirements.md#nfr-1), [NFR-2](02-requirements.md#nfr-2) | dropped |
| Scoring | Compute on read | Store is pure signals; a classifier change needs no re-score | 28 classifier calls per read, negligible | [ASR-1](03-asrs.md#asr-1), [ASR-2](03-asrs.md#asr-2); [NFR-7](02-requirements.md#nfr-7) | yes |
| Scoring | Precompute at refresh | Cheapest read | Re-score on every classifier change; store couples to classifier version | [NFR-2](02-requirements.md#nfr-2) | |
| Scoring | Cache results in Redis | Cheap read, no coupling | Invalidation on refresh and on classifier version | [NFR-2](02-requirements.md#nfr-2) | later, if measured |
| Ingest execution and limiting | In-request promise, in-memory single-flight and token bucket | No dependency | Lost on restart; wrong under more than one instance; limiter and lock are hand-written | [NFR-9](02-requirements.md#nfr-9), [NFR-12](02-requirements.md#nfr-12) | A only |
| Ingest execution and limiting | BullMQ jobs on Redis | Durable; deduplicated per location and source; queue limiter; retry with backoff; lifecycle events; enrichment is a second queue; processors move to a worker unchanged | One more Nest module; queue lifecycle in tests; per-minute limiter only, daily cap needs a counter | [ASR-3](03-asrs.md#asr-3), [ASR-4](03-asrs.md#asr-4), [ASR-5](03-asrs.md#asr-5); [NFR-5](02-requirements.md#nfr-5), [NFR-9](02-requirements.md#nfr-9), [NFR-13](02-requirements.md#nfr-13) | yes, B and C |
| Ingest execution and limiting | Lambda behind SQS | Serverless scale; isolation per job | Different runtime from the API; cold starts; local run needs emulation | [ASR-3](03-asrs.md#asr-3); [NFR-10](02-requirements.md#nfr-10) | target-state variant |
| Inbound limiting | ThrottlerModule with Redis storage; gateway in production | Correct under scale; gateway offloads later | None material | [NFR-12](02-requirements.md#nfr-12) | yes |
| Store | Redis only, AOF persistence | One container; native TTL; hosts the queues; no migrations; drift is a key-version bump and a refetch | Facts durability rests on AOF; no relational queries when facts grow; may read as "just a cache" | [ASR-3](03-asrs.md#asr-3), [ASR-4](03-asrs.md#asr-4); [NFR-9](02-requirements.md#nfr-9), [NFR-12](02-requirements.md#nfr-12); goal 3 | yes, A and C |
| Store | Redis plus PostgreSQL | Durable relational facts; PostGIS and history for enrichment; Aurora path | Migrations, a second container, more code for data that does not exist yet | [ASR-5](03-asrs.md#asr-5) future; goal 5 | B, when enrichment lands |
| Store | MongoDB | Flexible documents | Nothing Redis does not already give here | [ASR-2](03-asrs.md#asr-2) | no |
| Runtime | One image, roles by flag | One deployable; refresh on read needs no worker | Future enrichment jobs would share the process | [NFR-10](02-requirements.md#nfr-10); [A-25](registers.md#a-25) | yes |
| Runtime | API plus worker | Isolates background load | Second deployable for work that does not exist yet | [NFR-10](02-requirements.md#nfr-10) | B, for enrichment only |
| Schema | Code-first | Enum from registry; types shared | SDL is generated, less readable | [ASR-1](03-asrs.md#asr-1); [R-8](#r-8) | yes |
| Schema | SDL-first | Readable contract file | Enum hand-maintained; drifts from the registry | [FR-4](02-requirements.md#fr-4) | |
| Validation | Zod with a custom pipe | One schema per boundary; types inferred end to end; one dependency fewer | Ten lines of pipe to own | [NFR-11](02-requirements.md#nfr-11), [NFR-12](02-requirements.md#nfr-12); [R-9](#r-9) | yes |
| Validation | Zod via `nestjs-zod` | Ready-made pipe | Peer range stops at Nest 11; failures surface as `BAD_REQUEST`, not `BAD_USER_INPUT` (S-2) | [NFR-12](02-requirements.md#nfr-12) | no |
| Validation | class-validator | Nest default | Decorators duplicate types; no payload validation | [NFR-12](02-requirements.md#nfr-12) | |
| Tests | Vitest | ESM-native, fast, Jest-compatible API | Not the name in the role | [NFR-6](02-requirements.md#nfr-6) | yes |
| Tests | Jest | Named in the role | Slower; ESM friction | [NFR-6](02-requirements.md#nfr-6) | swap if asked |
| Deployment | Compose to run plus a Helm skeleton | Reviewer runs in one command; stack shown | Helm chart unexercised | [NFR-10](02-requirements.md#nfr-10); goal 5 | yes, option C |
| Deployment | Helm on EKS with Terraform | Full target | Days, not an evening | [NFR-10](02-requirements.md#nfr-10); goal 5 | option B |
| Payload storage | Raw snapshot plus signals | Replay, drift detection | Storage volume | [NFR-11](02-requirements.md#nfr-11), [NFR-13](02-requirements.md#nfr-13); [R-9](#r-9) | yes |
| Payload storage | Signals only | Lean | No replay | [NFR-11](02-requirements.md#nfr-11) | |

## Hypotheses each option depends on

- A and C: [H-1](registers.md#h-1), [H-3](registers.md#h-3), [H-6](registers.md#h-6), [H-5](registers.md#h-5). [H-3](registers.md#h-3) was refuted in part on 2026-10-14; the classifier thresholds absorb it ([A-9](registers.md#a-9)). If [H-1](registers.md#h-1) is refuted, [ASR-5](03-asrs.md#asr-5) is the landing zone for enrichment.
- B: all six, plus operational assumptions not on the list (ElastiCache availability, queue semantics, cluster access).
- Tier-2 incremental delivery depended on [H-7](registers.md#h-7), refuted by S-5; dropped.
- C depends on [H-8](registers.md#h-8), the toolchain fitting the time box; each failing piece has a named fallback in Step 4.

## Risk Register

| ID | Risk | Probability × Impact | Mitigation | Status |
| --- | --- | --- | --- | --- |
| <a id="r-1"></a>R-1 | NestJS, Redis, BullMQ, a Helm chart and the testing pyramid do not fit one evening. | H × M | Step 5 phases each leave a working service; BullMQ replaces hand-written lock and limiter code; Helm and the performance smoke test are late phases cut with a README line. | accepted for C, mitigation in Step 5 |
| <a id="r-2"></a>R-2 | Outdoor and indoor sightseeing scores computed from weather alone, with no location facts, are judged naive. | M × M | [A-23](registers.md#a-23) and [A-44](registers.md#a-44) stated; [ASR-5](03-asrs.md#asr-5) seam; [H-1](registers.md#h-1) golden set; README. | accepted for C, mitigation in Step 5 |
| <a id="r-3"></a>R-3 | Marine data presence admits lakes and lagoons as applicable surfing locations. | M × L | Wave height and period thresholds score them near zero with an explicit reason; the reason text mentions that the grid snaps to the nearest water cell within 10 to 15 km. | accepted for C; [H-3](registers.md#h-3) probed |
| <a id="r-4"></a>R-4 | Fair-use limit hit during review. | L × M | Outbound limiter, single-flight, store-first reads. | accepted for C, mitigation in Step 5 |
| <a id="r-5"></a>R-5 | In-process limiter and single-flight fail under multiple instances. | L × M | Interfaces; BullMQ job deduplication and queue limiter already hold across instances in B and C. | accepted for C, mitigation in Step 5 |
| <a id="r-6"></a>R-6 | Queue processors in the API process complicate test lifecycle. | M × L | Unit tests stub the queue; integration tests run processors against the redis service and await job completion; processors disabled by configuration where not needed. | accepted for C, mitigation in Step 5 |
| <a id="r-7"></a>R-7 | Scoring thresholds look arbitrary to the reviewer. | H × L | One rule file per activity with a rationale per threshold; [H-1](registers.md#h-1). | accepted for C, mitigation in Step 5 |
| <a id="r-8"></a>R-8 | The GraphQL schema hard-codes the four activities and the extensibility claim fails. | L × H | Activity enum generated from the registry; a [QAS-7](02-requirements.md#qas-7) test registers a fake activity. | accepted for C, mitigation in Step 5 |
| <a id="r-9"></a>R-9 | Open-Meteo changes its response shape and scores silently drift. | L × H | Payloads validated against a pinned schema version at the adapter; raw snapshot stored; versioned key prefix so drift means a refetch; failure is an anomaly event on the [ASR-4](03-asrs.md#asr-4) path; optional live contract job in CI. | accepted for C, mitigation in Step 5 |
| <a id="r-10"></a>R-10 | NestJS boilerplate eats the time box. | M × M | Five modules only (location, weather, ranking, api, infra); CLI generators; no custom decorators. | accepted for C; five modules |
| <a id="r-11"></a>R-11 | Reviewers read Redis as "just a cache" against the brief's rule to persist the data. | M × M | README explains the store model, the two namespaces and AOF persistence; repository interfaces show where PostgreSQL lands. | accepted for C; README section planned |
| <a id="r-12"></a>R-12 | The model `snow_depth` is zero on some glacier cells, so an open glacier resort is reported not applicable for skiing. | M × L | The reason text names the signal and value; resort elevation and snow facts are enrichment on the [ASR-5](03-asrs.md#asr-5) seam; the golden set carries Hintertux against Chamonix. | accepted for C; [A-50](registers.md#a-50) |

> **Review Gate 3** — passed 2026-10-14. Options accepted as characterised: NestJS throughout; Redis with AOF as the only store; stale-while-revalidate (withdrawn at the Gate 4 review, [A-51](registers.md#a-51)); BullMQ ingest and enrich queues in B and C; Zod, Vitest; `@defer` as tier 2 behind [H-7](registers.md#h-7).
