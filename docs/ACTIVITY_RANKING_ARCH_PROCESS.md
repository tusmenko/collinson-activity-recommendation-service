# Activity Ranking Service — Architecture Process

SEI-style collaborative architecture process for the Collinson Lead Engineer take-home. This document is a living record: every step's artifact lands here, and it ships in the public repo as part of the "how you worked" deliverable.

Status legend: `open` (not started), `in progress`, `gate pending`, `passed`, `revised`. Assumptions may also be `to verify (H-n)`, which points at the Hypotheses to Verify list.


| Step    | Artifact                             | Status                      |
| ------- | ------------------------------------ | --------------------------- |
| Stage 0 | Feature context: inputs, goals, plan | passed (revised 2026-10-14) |
| Step 0  | Stakeholder map                      | passed 2026-10-14           |
| Step 1  | Requirements + QAS + baseline        | passed 2026-10-14           |
| Step 2  | Utility tree + ASRs + tactics        | passed 2026-10-14           |
| Step 3  | Solution options                     | passed 2026-10-14                |
| Step 4  | ADR + design                         | in progress                        |
| Step 5  | Implementation plan                  | open                        |


---



## Feature Context



### Problem statement

Build a backend service that accepts a city or town name and ranks how good each of the next 7 days will be for four activities: skiing, surfing, outdoor sightseeing, and indoor sightseeing. Weather data comes from Open-Meteo and must be persisted rather than fetched on every request; how it is modelled, stored, and refreshed is part of the problem. The API is GraphQL on Node.js, written in TypeScript. No front end. Storage is our choice.

The brief is deliberately loose. The reviewers grade the reasoning, the assumptions committed to, and the questions that would normally go to a product manager, above the code itself.

### Goals and success criteria

Ordered as the brief orders them, with one business driver above all of them.

1. **Pass the assignment.** This is a hiring exercise. Every other goal serves this one, and scope decisions are judged by whether they help a reviewer say yes.
2. **Reasoning is visible and followable.** This document, the assumptions register, the open questions log, and a readable commit history are the primary deliverable. Cuts and time-outs are recorded with a one-line reason rather than hidden.
3. **The service works and is explained.** A GraphQL endpoint answers the ranking query for a named city; data is persisted and refreshed; a short README covers what was built, how to run it, and the assumptions.
4. **Focused over exhaustive.** A small, well-reasoned submission beats a broad one. Anything not on the critical path is noted as a future step, not built.
5. **Survives a live walkthrough.** Final interview is 1h–1h30 screen-share with an Engineering Manager and a Principal Engineer, with questions on design and architecture decisions and possibly a few lines of live coding. Every decision here should be defensible out loud.

Two further goals confirmed by the candidate at the stage 0 gate:

1. **Show the company's stack in use.** Echo the job description stack where it is affordable in a day (TypeScript, GraphQL, Jest, TDD, GitHub Actions, containers, an observability mindset), and keep the engineering practice consistent with how the role is described (SEI-style design, testing pyramid, CI quality gates). Where it is not affordable (Kubernetes, Terraform, Kafka, Aurora), describe the production path in the README instead of building it.
2. **Apply LLM-ops practice if an LLM layer is designed.** An LLM inside the service is a Step 3 option, not a requirement, and is not added for show; the use case in view is classification of activity suitability where deterministic rules fall short, for example after enriching a location with points-of-interest data. If an option includes one, it must carry the production practices that make LLM features operable: versioned prompts, observability of calls (latency, tokens, cost, traces), a gateway or provider abstraction, structured and validated outputs, and durable execution for long-running or retried work. The same practices are described as a production path if the layer is designed but not built. The development-time AI tooling that drove this process (agent and skill definitions, conventions file) is committed as part of goal 1, not as LLM-ops.



### Inputs and source documents


| Source                   | What it gives us                                                                                                            | In repo?                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `ASSIGNMENT.md`          | The brief: scope, activities, stack, grading order                                                                          | Yes                               |
| Role context             | Public job description for the role: team shape, production stack, interview stages. Informs goal 5 only.                   | Not reproduced                    |
| Process constraints      | TypeScript mandatory; public GitHub repo; 5 working days; live walkthrough after review                                     | Summarised under Hard constraints |
| Open-Meteo Geocoding API | City or town name to coordinates, timezone, country; handles ambiguity by returning multiple matches                        | External                          |
| Open-Meteo Forecast API  | Daily and hourly weather variables up to 16 days: temperature, precipitation, snowfall, wind, cloud cover, UV, weather code | External                          |
| Open-Meteo Marine API    | Wave height, period, direction for coastal points; the only surfing-relevant signal                                         | External                          |


Open-Meteo is free for non-commercial use, needs no API key, and documents a fair-use limit of roughly 10,000 requests per day. Exact variables, limits, and the behaviour of the Marine API for inland coordinates are to be verified in Step 1, not assumed.

### Codebase findings

Greenfield. The repository has no commits. A `.gitignore` exists covering `node_modules`, build output, `.env*`, local SQLite files, logs, and editor files.

### Hard constraints

- Language: TypeScript. Runtime: Node.js. API style: GraphQL.
- Data source: Open-Meteo. Weather data must be persisted and refreshed, not fetched per request.
- No front end.
- Deliverable: public GitHub repo plus short README.
- Deadline: 5 working days from receipt on 2026-10-14. The candidate's own target is to finish on 2026-10-14 and send on 2026-10-15. The time box is therefore one working evening, which is the single strongest constraint on scope.
- Must be presentable in a live screen-share and runnable on a reviewer's machine.



### Plan and time budget

Revised at the stage 0 gate: finish today, send tomorrow. Hours are a budget, not a promise; slippage eats implementation scope, not the reasoning trail.


| Slot    | When                     | Work                                                        | Checkpoint                                    |
| ------- | ------------------------ | ----------------------------------------------------------- | --------------------------------------------- |
| 1       | 2026-10-14 16:30–17:30   | Steps 0–2: stakeholders, requirements, QAS, ASRs            | Gates 0–2 passed                              |
| 2       | 2026-10-14 17:30–18:30   | Steps 3–4: options, ADR, component and sequence diagrams    | Gate 4 sign-off                               |
| 3       | 2026-10-14 18:30–19:00   | Step 5 plan, repo scaffold, CI skeleton, first commits      | Pipeline green on empty project               |
| 4       | 2026-10-14 19:00–23:00   | Implementation phases in Step 5 order; one commit per phase | End-to-end query works against persisted data |
| 5       | 2026-10-14 23:00–23:30   | README, assumptions final pass, cut list                    | Repo complete locally                         |
| 6       | 2026-10-15 morning       | Fresh-eyes read, clean-clone run, make public, send         | Sent                                          |
| Reserve | 2026-10-16 to 2026-10-21 | Unused unless slot 6 finds a blocker                        | —                                             |


Process rules for this engagement:

- One commit per gate transition on the architecture side; one commit per implementation phase on the code side. Commit messages carry the decision, not just the diff.
- Questions a product manager would answer are logged in the Open Questions Log with the assumption chosen, then carried into the README.
- Anything cut is logged with the reason in the Risk Register or Open Questions Log, whichever fits.



### Open questions (stage 0)

These are about the engagement itself, not the product. Product questions start in Step 1.


| #    | Question                                                                                                                                      | Resolution                                                                                                                             | Status              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| S0-2 | How far to echo the JD stack?                                                                                                                 | Build what fits in a day; describe the rest as a production path. Stack utilisation is an explicit goal, not a nice-to-have.           | resolved 2026-10-14 |
| S0-3 | What counts as "show how you worked"?                                                                                                         | This document, the assumptions and decisions trail, commit history, and the AI tooling files committed to the repo. No raw transcript. | resolved 2026-10-14 |
| S0-4 | This document ships publicly. Keep the reviewers' personal names in the stakeholder map, or reduce them to roles before the repo goes public? | Keep the names. | resolved 2026-10-14 |


Assumption carried into the Assumptions Register at Step 1:

- **A-0 (resolved 2026-10-14).** "LLM-ops practices" means the production practices for an LLM layer: prompt versioning, call observability, a gateway or provider abstraction, structured validated outputs, and durable execution (in the spirit of tools such as an LLM gateway, Pydantic AI, LangGraph, Temporal). An LLM inside the service remains a Step 3 option and is not added for show; if designed, it follows these practices. Development-time AI tooling committed to the repo is part of goal 1.

---



## Step 0 — Stakeholder Map

A take-home has an unusual stakeholder shape: the people grading it stand in for the product manager, the user, and the operator at once, and the candidate holds every decision. Naming the absent roles anyway is what makes the assumptions register meaningful, because each logged assumption needs an owner who would have answered it in a real squad.


| Role                                         | Who                                                                                                                                 | Concerns                                                                                                                                                                                        | Constraints they impose                                                                                             | Decision authority over tradeoffs                                                                                                                                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate                                    | Yevhenii                                                                                                                            | Pass the assignment; finish in one evening; show the company's stack and disciplined LLM use; defend every decision live                                                                        | One-evening time box; TypeScript, Node.js, GraphQL; focused scope                                                   | Final say on all tradeoffs and scope cuts. Owner of every assumption logged against an absent role.                                                                                                           |
| Hiring manager and lead reviewer             | Shane Patrick, Principal Engineer                                                                                                   | Can he follow the reasoning and the calls made; are assumptions explicit; is the modelling, storage, and refresh approach sound; is the code robust and testable; does it run on his machine    | "Don't polish"; focused beats exhaustive; no front end; persist the data; public repo; TypeScript                   | None over our choices, but his rubric defines what a good tradeoff is. He is the proxy product manager: every PM question is written as if addressed to him. Also wears the consumer and operator hats below. |
| Head of Architecture and Engineering         | Name unknown (stage 5 interview)                                                                                                    | Architectural maturity; awareness of the production path; how the design would evolve beyond the exercise                                                                                       | None directly                                                                                                       | Influences the hire, not the artifact. Served by the ADR, the rejected alternatives, and the production-path section.                                                                                         |
| Recruitment                                  | Matthew Piercy, HR sent the brief                                                                                                   | Delivered on time, in TypeScript, as a GitHub link                                                                                                                                              | Deadline; GitHub hosting                                                                                            | Process gate only: forwards the repo to the reviewers.                                                                                                                                                        |
| Product manager                              | Absent, implied by the brief; Shane Patrick answers in their place                                                                  | Functional requirements, scope, etc.                                                                                                                                                            | None, because absent. Each question becomes a logged assumption with a stated default.                              | Delegated to the candidate by the brief. Assumptions are written so a real PM could overturn them cheaply.                                                                                                    |
| API consumer                                 | Shane Patrick during review; in production a travel or loyalty front end in Collinson's domain of airport lounges, airlines, hotels | Correct and explainable rankings; predictable schema; fast response; sensible errors for unknown or ambiguous places; easy to poke at from a GraphQL playground                                 | Response-time expectations; schema stability; discoverable schema                                                   | None. Represented by the candidate through the QAS.                                                                                                                                                           |
| Operator (deploys and maintains the service) | Shane Patrick during review; the engineer who deploys and maintains it in production                                                | Starts with one command on a clean clone; deployable without manual configuration; refresh job observable; failures of the upstream visible and non-fatal; no secrets or accounts needed to run | Containerised run; configuration by environment; logs and health                                                    | None. Served by the deployability and availability QAS and the production-path notes.                                                                                                                                                |
| Upstream provider                            | Open-Meteo                                                                                                                          | Fair use of a free, keyless API                                                                                                                                                                 | Roughly 10,000 requests per day; variables and coverage as published; Marine data only meaningful at coastal points | None. Pure constraint-setter; drives the persistence and refresh design.                                                                                                                                      |


Observations that will shape Step 1:

- Shane Patrick holds four hats: lead reviewer, proxy product manager, first API consumer, and first operator (the person who deploys and maintains it). Design for the person who will clone the repo, run one command, open a GraphQL playground, and read this document in the same sitting.
- The candidate's time box conflicts with the reviewers' interest in depth. The reviewers' stated preference for focus wins; depth goes into the written reasoning, not into code.
- The absent product manager is the busiest row. Expect the Open Questions Log to be dominated by ranking semantics and data freshness.
- Open-Meteo's rate limit is a real constraint only if many distinct cities are queried; the persistence requirement is a stated rule of the exercise regardless of load.



## Step 1 — Requirements Recomposition + Current Architecture Baseline

### 1a — Requirements

Traceability rule: every item below names its source. "Brief" means a line of `ASSIGNMENT.md`. "Step 0" means a stakeholder concern recorded in the stakeholder map. Anything the brief does not say is derived; derived items are assumptions, carry an assumption ID, and stay open until the proxy product manager confirms them. Numbers in measures are proposals, never facts.

#### Functional requirements from the brief

| ID | Requirement | Source | MoSCoW | Owner |
| --- | --- | --- | --- | --- |
| FR-1 | Accept a city or town as the input. | Brief: "takes a city or town" | Must | Product manager |
| FR-2 | Cover the next 7 days. | Brief: "the next 7 days" | Must | Product manager |
| FR-3 | Cover each of four activities: skiing, surfing, outdoor sightseeing, indoor sightseeing. | Brief: the activity list | Must | Product manager |
| FR-4 | For each activity, rank how good each day will be. | Brief: "ranks how good the next 7 days will be for each of these activities" | Must | Product manager |

The brief specifies nothing else functionally. Everything below is derived.

#### Derived behaviour (assumptions, not requirements)

| ID | Behaviour | Gap it fills | Traced to | Status |
| --- | --- | --- | --- | --- |
| DF-1 | When the name matches several places, use the best match and return it with the alternatives. | FR-1 is silent on ambiguity; geocoding returns several matches. | OQ-5, A-10 | open |
| DF-2 | When the name matches nothing, return a typed not-found error. | FR-1 is silent on failure. | OQ-13, A-14 | open |
| DF-3 | When the location cannot support an activity, return it as not applicable with the reason. | FR-3 and FR-4 are silent on inland surfing and snowless skiing. | OQ-3, OQ-4, A-8, A-9 | open |
| DF-4 | With each score, return the weather inputs it was computed from. | Step 0, API consumer: "explainable rankings". | OQ-14, A-15 | open |
| DF-5 | With each response, show when the data was fetched. | Follows from the persist-and-refresh constraint; the consumer cannot otherwise judge the ranking. | OQ-15, A-16 | open |
| DF-6 | When only the marine source fails, surfing is reported as unavailable (distinct from not applicable), the other activities are computed, and the response is flagged partial. When the forecast source fails and nothing is stored, return a typed `UPSTREAM_UNAVAILABLE` error with a retry hint and the resolved location if geocoding succeeded. | NFR-4 is silent on the empty-store case and on per-source failure. | QAS-11, A-19 | open |

#### Non-functional requirements

| ID | Quality | Requirement | Source | Proposed measure | Assumption |
| --- | --- | --- | --- | --- | --- |
| NFR-1 | Performance: timeliness | Stored weather data is refreshed. | Brief: "how you model, store, and refresh it is part of the problem" | Served data no older than a TTL of 6 h plus one refresh cycle; TTL configurable | A-11 |
| NFR-2 | Deployability | A reviewer can run the service from the README. | Brief: "how to run it"; Step 0, Operator | One command on a clean clone, under 2 minutes, no key or account | A-17 |
| NFR-3 | Performance | Reads answer quickly. | Step 0, API consumer: "fast response" | Warm read: zero upstream calls, p95 under 300 ms locally. Cold read: at most three upstream calls, under 3 s | A-18 |
| NFR-4 | Availability | Upstream failure does not take the service down. | Step 0, Operator: "failures of the upstream visible and non-fatal" | Serve stored data flagged stale; forecast failure with an empty store returns a typed `UPSTREAM_UNAVAILABLE` error with a retry hint and the resolved location, within a 2 s timeout plus one retry (under 4.5 s total); marine-only failure degrades surfing to unavailable and flags the response partial | A-19 |
| NFR-5 | Availability: fault detection | Refresh activity and upstream calls are visible to the operator. | Step 0, Operator: "refresh job observable" | Each upstream call and refresh logged with latency and outcome; health endpoint | A-20 |
| NFR-6 | Testability | The full testing pyramid runs without the live upstream: unit, integration, schema and contract, end-to-end, plus a performance smoke test. | Step 0, Hiring manager: "robust and testable"; goal 5 | Unit tests for classifiers, limiter and invalidation; integration tests for adapters on recorded fixtures, the store and the refresh flow; schema snapshot and query contract tests for the GraphQL API, with a Pact-style consumer contract described as the production path; one end-to-end query through the running service with a stubbed upstream; a performance smoke test against the running service (k6 or autocannon style) reporting p95 for warm reads and wall time for one cold read, run locally and as an optional CI job, with the inbound limiter raised by configuration so it measures the service rather than the limiter; all in CI under 5 minutes | A-21 |
| NFR-7 | Modifiability: extensibility | A new activity can be added, including one that needs a new data signal, without changing ingest, store, or API code beyond registering the new activity classifier. | Proxy product manager at Gate 1, 2026-10-14: classifiers are the natural point of growth. | Adding an activity is one new classifier module plus registration; existing classifiers and tests untouched | A-22 |
| NFR-8 | LLM-ops | If an LLM-assisted classifier is built (OQ-16), it carries versioned prompts, call observability, provider abstraction and validated structured output. | Goal 6 | Applies only if the option is chosen in Step 3 | A-0 |
| NFR-9 | Availability: upstream access | Outbound calls to Open-Meteo stay within the fair-use limits regardless of inbound load. | Fair-use constraint; proxy product manager at Gate 1, 2026-10-14: implement from the start. | Outbound limiter at 600 per minute, 5,000 per hour, 10,000 per day, configurable; single-flight per location so concurrent cold reads fetch once | A-27, A-32 |
| NFR-10 | Deployability | The service builds, tests and packages from CI with no manual steps; the production deploy path uses the stack named in the role. | Goal 5; role description: build, deploy and run systems end to end without manual configuration. | GitHub Actions on every push: lint, type check, tests, Docker image build. Deploy path described, not executed: image to a registry, Helm chart to EKS, Terraform for infrastructure, Datadog for telemetry | A-40 |
| NFR-11 | Modifiability: provider neutrality | A weather or enrichment provider can be added or replaced behind a provider interface; the stored model is provider-neutral. | Proxy product manager at Gate 1, 2026-10-14: integrations are a natural point of extension. | Store holds normalised daily signals, not Open-Meteo payloads; one adapter per provider; swapping a provider touches the adapter and its fixtures only; upstream payloads validated against a pinned provider schema version at the adapter, raw snapshot stored, drift surfaces as an anomaly event (NFR-13) | A-41 |
| NFR-12 | Security | Every inbound request is validated and rate-limited at the API boundary before any store or upstream access. | Proxy product manager at Gate 1, 2026-10-14: validation is critical; inbound limits from the start. | Schema types plus explicit validation of length, charset and bounds; per-client token bucket, configurable; typed errors for malformed or over-limit requests; tests for both | A-27, A-28 |
| NFR-13 | Availability: fault detection; Testability | Every score is traceable to the data and the classifier version that produced it, and classification anomalies are detectable. | Proxy product manager at Gate 2, 2026-10-14. | Each score carries provider, fetched-at, classifier id and version, and rule-set version; one structured event per ranking; invariant checks (score within range, rank is a permutation of the days, not-applicable carries no score, applicability stable across refreshes) logged as anomalies with a counter. Production path: metrics and alerts, drift checks against the golden set. The classifier version is the same concept as a prompt version, so NFR-8 builds on it. | A-42 |

#### Cross-cutting concerns

The brief is silent on these. Each row records what the exercise does and what is left to the production path, so a reviewer can see the concern was weighed either way. Rows that a stakeholder confirmed are routed to the NFR table.

| ID | Concern | In the exercise | Deferred to production |
| --- | --- | --- | --- |
| A-24 | Expected load | Designed for interactive use: one reviewer, tens of requests per minute, a handful of locations. | A load target; read-heavy traffic on popular cities absorbed by the store and TTL. |
| A-25 | Scalability | Process kept stateless; single process, single store. Stale-while-revalidate removes the need for a worker. | Horizontal scale as a deployment concern. |
| A-26 | Authentication, authorisation | None; open on localhost; no user data. | Gateway or JWT at the edge. |
| A-27 | Rate limiting | Outbound limiter toward Open-Meteo at the fair-use limits (NFR-9). Inbound per-client limiter, configurable, on by default (NFR-12). | Gateway-level inbound limits; distributed limiter if multi-instance. |
| A-28 | Input validation and security | Every input validated at the API boundary: length, charset, bounds; typed errors; dependencies pinned; introspection on for the reviewer (NFR-12). | Depth and complexity limits; introspection off; dependency scanning. |
| A-29 | API versioning | Additive schema evolution; deprecations for breaking changes. | Same. |
| A-30 | Data retention and classifier evaluation | Latest forecast per location only. Classifier outputs (inputs, score, reason) logged as structured events. Each event carries the classifier and rule-set version (NFR-13). | Golden-dataset evaluation outside the running app, fed by the log; matters most for an LLM-assisted classifier. |
| A-31 | Privacy, PII | Place names only; no identity; no client addresses in logs. | Same. |
| A-32 | Refresh concurrency | Single-flight per location: in-memory map in A; BullMQ `jobId` deduplication in B and C (NFR-9). | BullMQ deduplication already holds across instances. |
| A-33 | Backup, recovery | Store treated as a rebuildable cache of upstream data; loss means refetch. | No backups unless history is kept. |
| A-34 | Store key and invalidation | Forecast keyed by location and forecast window in local dates; upsert on refresh; stale when the window no longer covers today, regardless of TTL; the key is provider-neutral. | Same. |
| A-35 | Deployment target | Local Docker Compose. | Container on EKS via Helm; Terraform for infrastructure (NFR-10). |
| A-36 | Configuration and secrets | Environment variables; `.env.example` lists every variable; no secrets exist. | Secrets manager. |
| A-37 | Cost | Zero: free API, local store. | Not estimated; premature until a deployment target is fixed. |
| A-38 | SLA | None; best effort. | Define once a consumer exists. |
| A-39 | Supply chain | Lockfile committed; CI installs with a frozen lockfile. | Dependabot and audit in CI. |
| A-40 | CI/CD | GitHub Actions on every push: lint, type check, tests, image build (NFR-10). | Registry, Helm and EKS deploy steps. |
| A-41 | Provider neutrality | Provider interface; one adapter per provider; normalised daily signals in the store (NFR-11). | Same. |

#### Constraints

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

#### Quality attribute scenarios

Each scenario traces to a concern above. Every measure is a proposal under the assumption named in the NFR table.

| ID | Attribute | Concern source | Source | Stimulus | Artifact | Environment | Response | Proposed measure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QAS-1 | Performance | NFR-3 | API consumer | Queries rankings for a location already in store and fresh | GraphQL API, store | Normal | Rankings computed from stored data | p95 under 300 ms locally; zero upstream calls |
| QAS-2 | Performance | NFR-3 | API consumer | Queries a location never seen before | API, ingest, store | Normal, upstream healthy | Geocode, fetch forecast and marine, persist, rank | Under 3 s; at most 3 upstream calls |
| QAS-3 | Availability | NFR-4 | Open-Meteo | Times out or returns 5xx | Ingest | Store holds data older than TTL | Serve stored data flagged stale with its fetched-at time | Every request with stored data answered; upstream timeout 2 s; error only when store is empty |
| QAS-4 | Performance | NFR-1 | Clock | Stored data passes the TTL | Refresh | Normal | Serve stored data at once with the stale flag; single-flight background refetch; next read fresh | Stale served for at most one request past the TTL; served data never older than TTL plus one refresh cycle; TTL default 6 h, configurable |
| QAS-5 | Usability | DF-1 | API consumer | Queries "Springfield" | Geocoding adapter, API | Normal | Rank the best match; return its name, region, country; list up to 5 alternatives | Resolved location present in every response; alternatives present when more than one match |
| QAS-6 | Usability | DF-2 | API consumer | Queries a name with no match | API | Normal | Typed `NOT_FOUND` error naming the input | No forecast or marine call made; under 1 s |
| QAS-7 | Modifiability | NFR-7 | Developer | Adds a fifth activity, for example cycling, that needs wind and rain signals already stored | Classifier registry, API schema | Development | Write one classifier module, register it; the API exposes it | No change to ingest, store, or existing classifiers; existing tests pass unchanged; under 2 hours |
| QAS-8 | Deployability | NFR-2 | Operator | Clones the repo and starts the service | Repo, container, store | Clean machine with Docker and Node | Service and store up, health endpoint green, playground reachable | One command; under 2 minutes; no keys or accounts |
| QAS-9 | Testability | NFR-6 | CI | Push to any branch | Pipeline | GitHub Actions | Lint, type check, unit, integration, schema and contract, end-to-end; performance smoke test as an optional job | All four gating test levels run; under 5 minutes; zero live calls to Open-Meteo; the performance job reports p95 against the QAS-1 and QAS-2 numbers |
| QAS-10 | Usability | DF-4, DF-3 | API consumer | Asks why a day scored as it did | API response | Normal | Each score carries the input values and a reason label; non-applicable activities say why | Every score has at least its inputs and one reason; applicability flag always present |
| QAS-11 | Availability | NFR-4, DF-6 | Open-Meteo | Forecast endpoint fails or times out | Ingest, API | No stored data for the location | Bounded wait, then typed `UPSTREAM_UNAVAILABLE` with retry hint; resolved location still returned when geocoding succeeded; marine-only failure degrades surfing only | Under 4.5 s total; no unbounded wait; location present; partial flag set when any source failed |

### 1b — Current Architecture Baseline

Greenfield. There is no current system, so there is no as-is architecture to annotate. The baseline is the environment the service lands in: the upstream integration points and the behaviours they exhibit, verified by probing. Any design must handle these; they are facts, not design.

#### Integration points (verified live on 2026-10-14)

| Integration | Finding |
| --- | --- |
| Geocoding | `geocoding-api.open-meteo.com/v1/search?name=…&count=N&language=en` returns up to N matches with name, country, admin1, latitude, longitude, elevation, timezone, population and feature code. Unknown names return no `results` key. "Springfield" returns five US matches, population-ordered. |
| Forecast | `api.open-meteo.com/v1/forecast` with `daily=` supports weather_code, temperature_2m_max/min, precipitation_sum, rain_sum, snowfall_sum (cm), precipitation_probability_max, wind_speed_10m_max, wind_gusts_10m_max, sunshine_duration, daylight_duration, uv_index_max, cloud_cover_mean, visibility_mean. `timezone=auto`; `forecast_days` default 7, maximum 16. Hourly `snow_depth` available. Response carries the grid-cell elevation. |
| Marine | `marine-api.open-meteo.com/v1/marine` with `daily=` supports wave_height_max, wave_period_max, wave_direction_dominant, swell_wave_height_max, swell_wave_period_max. Inland points (Chamonix, Springfield, London) return HTTP 200 with every value `null`. Coastal points (Biarritz, Lisbon) return values. |
| Model updates | Forecast models refresh between every hour and every 6 hours depending on the model. |
| Limits and licence | Non-commercial fair use: fewer than 10,000 calls per day, 5,000 per hour, 600 per minute. No API key. Data under CC-BY 4.0; attribution required. |

#### Observed upstream behaviours

| Observed behaviour | Evidence | Handled by |
| --- | --- | --- |
| Inland coordinates: the Marine API returns HTTP 200 with every value `null`, not an error. | Probe 2026-10-14 (Chamonix, Springfield, London) | DF-3 |
| Unknown name: the Geocoding API returns a body with no `results` key. | Probe 2026-10-14 | DF-2 |
| Ambiguous name: the Geocoding API returns several population-ordered matches. | Probe 2026-10-14 ("Springfield", five US matches) | DF-1 |
| Forecast models refresh between every hour and every 6 hours. | Open-Meteo documentation | NFR-1 |
| Fair-use limits of 600 per minute, 5,000 per hour, 10,000 per day; no key; CC-BY 4.0. | Open-Meteo terms | NFR-9, constraints |
| Outage or timeout of any upstream endpoint. | Not observed; assumed possible | NFR-4, A-19 |

> **Review Gate 1** — passed 2026-10-14. Decisions: outbound and inbound rate limiting from the start; input validation is critical; classifiers and provider integrations are the extension points; LLM use limited to a classifier option where deterministic rules fall short; no invented as-is baseline for greenfield.

## Step 2 — ASRs + Utility Tree

### 2a — Utility Tree

Ratings are importance to stakeholders × difficulty to achieve. Top-level nodes are the SEI quality attributes; refinements under them use the project's own terms. Rated by the candidate as proxy for the hiring manager and the product manager; confirmed or adjusted at Gate 2. Twenty-two leaves, two above the usual ceiling; the testability node accounts for the excess and is kept whole on purpose.

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

### 2b — ASR shortlist and tactics

The High/High and High/Medium leaves collapse into five architecturally significant requirements. High/Low leaves (warm performance, deployability, unit and schema testing, security, name handling) are design work and fall out of ASR-2 and ASR-3 once those are in place.

**ASR-1 — Classifier contract and registry** [H / H]. Leaves: QAS-7, QAS-10, DF-3, OQ-16. Decision forced: the shape of an activity classifier and how the API discovers it. Inputs are normalised daily signals plus location context (elevation, a coastal flag derived from the presence of marine data). Outputs are a score, an applicability flag with a reason, and the inputs used. A registry makes adding an activity one module plus one registration, and the API derives its activity list from the registry instead of hard-coding four. The contract must allow an asynchronous classifier with external inputs so an LLM-assisted one can be added without changing the pipeline. Tactics: encapsulate (classifier interface), use an intermediary (registry), separate concerns (signals, scoring, API), defer binding (activity list resolved from the registry at startup). Pattern choice is Step 4 work; the candidate is a registry of strategies. Chain of responsibility is a weak fit because every classifier runs and none short-circuits.

**ASR-2 — Provider-neutral signal model** [H / M]. Leaves: NFR-11, A-34, A-41, QAS-9. Decision forced: what the store holds. Normalised daily signals keyed by location and forecast window, not Open-Meteo payloads; forecast and marine merged into one record per location and day; a provider adapter maps each upstream to the model. This seam is also what makes testing fixture-based. Tactics: abstract common services, use an intermediary (adapter), restrict dependencies (only adapters know provider formats).

**ASR-3 — Refresh strategy under fair use** [H / M]. Leaves: QAS-4, QAS-1, NFR-9, OQ-9. Decision forced: when data is fetched. Refresh on read when stale, background refresh of known locations, or both. In every variant: store-first reads, an outbound limiter at the fair-use limits, single-flight per location, and invalidation when the forecast window no longer covers today. Tactics: introduce cache (the store), manage sampling rate (limiter), use asynchronous processing (background refresh), bound resource use (single-flight).

**ASR-4 — Degradation on upstream failure** [H / M]. Leaves: QAS-3, QAS-11, NFR-4, DF-6. Decision forced: the read path is store-first and a refresh failure never fails a read that has stored data. With an empty store the wait is bounded (2 s timeout, one retry) and the answer is a typed `UPSTREAM_UNAVAILABLE` with a retry hint and the resolved location. Degradation is per source: forecast is mandatory, marine is optional, so a marine-only failure costs only surfing. Tactics: timeout, limited retry, graceful degradation, exception handling at the adapter boundary, partial response.

**ASR-5 — Location facts and the enrichment seam** [H / M]. Leaves: OQ-16, OQ-18, NFR-8, NFR-11, NFR-13. Decision forced: the data model has two storage classes from day one. Forecast data is a cache: TTL, window-keyed, rebuildable. Location facts are long-lived and versioned: the geocoding result (name, coordinates, elevation, timezone, coastal flag) is the first fact, and points of interest, attractions or walkability would be further facts. Enrichment, whether a deterministic source such as OpenStreetMap or an LLM, is an adapter on the ASR-2 provider seam that writes facts, and the ASR-1 classifier contract takes facts as input. The exercise stays weather and geo only (A-23); a proof of concept for sightseeing enrichment is deferred and recorded as a risk in Step 3. If the LLM path is taken, NFR-8 applies and the classifier version from NFR-13 doubles as the prompt version. Tactics: separate concerns (facts versus cache), encapsulate (fact store behind an interface), defer binding (enrichment source chosen later), maintain a version of the data and of the classifier.

Sensitivity preview for Step 3: ASR-1, ASR-2 and ASR-5 share one seam, the signal and facts model that classifiers consume. A wrong model breaks all three; the options in Step 3 are judged first on that seam, then on the refresh strategy of ASR-3.

> **Review Gate 2** — passed 2026-10-14. Utility tree on the SEI attributes, 22 leaves; five ASRs; Hypotheses to Verify started with H-1 to H-6.

## Step 3 — Solution Options

### Common ground

All three options share the seam fixed by ASR-1, ASR-2 and ASR-5: a classifier registry, one adapter per provider, normalised daily signals, two storage classes (forecast cache, location facts). They share the framework too: NestJS on Node.js with TypeScript, chosen because its modules map onto the requirements without custom plumbing.

| NestJS piece | Requirement covered |
| --- | --- |
| GraphQL code-first with the Apollo driver | FR-4 schema; the activity enum is generated from the registry (R-8) |
| Dependency injection and modules | ASR-1 registry, ASR-2 adapters, ASR-5 facts versus cache |
| Zod schemas via `nestjs-zod` | NFR-12 argument validation; NFR-11 upstream payload validation; config validation; TypeScript types inferred from the same schemas |
| ThrottlerModule | NFR-12 inbound limiter; in-memory storage in A, Redis storage in B and C |
| BullMQ module (`@nestjs/bullmq`) | ASR-3 ingest execution in B and C: durable jobs on Redis, `jobId` deduplication as single-flight, queue limiter as the outbound fair-use limiter, retry with backoff, lifecycle events for NFR-5 and NFR-13; a second queue `enrich` is the attachment point for ASR-5 |
| Terminus (`@nestjs/terminus`, the health-check module: `/health` with Redis and memory indicators in the format Kubernetes probes consume) | NFR-5 health endpoint |
| ConfigModule | A-36 environment configuration |
| pino logging and the OpenTelemetry SDK | NFR-5 logs, NFR-13 ranking events and anomaly counter |
| Vitest | NFR-6 testing pyramid; end-to-end tests use native `fetch` against `app.listen(0)` or Apollo's `executeOperation`; Jest is the swap if the reviewers prefer it |
| ioredis behind repository interfaces | ASR-2 and ASR-5 storage: forecast cache under TTL keys, location facts under no-TTL keys, versioned key prefixes; throttler storage; daily fair-use counter |

Three decisions are common to all options. Refresh is stale-while-revalidate: a read whose stored data is stale or whose window no longer covers today is served at once from the store with the stale flag set, a single-flight background refetch runs, and the next read is fresh; a location never seen before is the only blocking fetch. Scheduled refresh of known locations was rejected at Gate 3 because it refetches locations nobody asks for and burns fair use; incremental delivery (`@defer`, cached part first and fresh part streamed in the same response) is a later option. Scores are computed on read from stored signals, not precomputed at refresh: the store stays pure signals (ASR-2), classifiers change without re-scoring stored data (ASR-1), and the cost is four classifiers times seven days per read. Upstream payloads are validated at the adapter against a pinned provider schema version, the raw snapshot is stored next to the normalised signals, and a validation failure is an anomaly event (NFR-13) that takes the ASR-4 degradation path rather than crashing (R-9).

Traceability mechanism (NFR-13). Every classifier module exports `id` and `version`; the thresholds file exports `ruleSetVersion`. Each ranking request emits one structured log event: request id, location id, provider, fetched-at, window start, and per activity the classifier id and version, score, applicability, reason and inputs. Invariants run in-request: score within 0 to 100, ranks form a permutation of the seven days, not-applicable carries no score; the coastal flag is a stored fact, so a change on refresh emits its own event. A violation logs at warn level and increments `ranking_anomalies_total{type}`. In the exercise the events go to stdout as JSON; on the production path a Datadog log pipeline and a monitor on the counter consume them, and the golden-set evaluation reads the same events offline. An LLM-assisted classifier would set `version` to its prompt version.

Ingest pipeline (ASR-3, ASR-4). Ingest is an extract-transform-load run per location, triggered by a request today. It is modelled as an `IngestPipeline` built from source steps: geocode, forecast, marine, and later enrichment. Each step validates its payload with zod, has a timeout and a bounded retry, and carries a policy flag, mandatory or optional. Independent steps run in parallel; writes are idempotent upserts under single-flight; the outcome is succeeded, partial or failed; every run emits an event with per-step durations, and the last failure is kept under `ingest:last-error:{locationId}` for the operator. In option A the pipeline runs as an in-request promise under an in-memory single-flight map. In options B and C every ingest is a BullMQ job on the `ingest` queue: the job id is the location and window, so a duplicate add while a job is active is a no-op (single-flight); the queue limiter caps jobs per minute under the fair-use limit, with a daily counter in Redis as the second guard; attempts and backoff replace per-step retry code; a job survives a process restart. A cold read enqueues and awaits the job under the 4.5 s bound; a stale read enqueues and returns at once. Enrichment is a second queue, `enrich`, with its own limiter and retry policy, enqueued by the ingest job when facts are missing and writing to the facts namespace; an LLM enrichment job carries its prompt version. In the exercise the `enrich` queue is registered without a processor so the attachment point is visible. Processors run in the API process now and move to a worker deployment unchanged. A Lambda behind SQS is the serverless form of the same shape on the target state, listed and not chosen.

Store engine was debated at Gate 3. The data today is a TTL cache plus a few small facts (the geocoding result, a coastal flag), so SQL buys nothing yet. Redis with AOF persistence holds both storage classes as namespaces with different TTL policy: `forecast:v1:{locationId}:{windowStart}` under TTL, `location:v1:{id}` without. Schema drift is handled by bumping the key version prefix and refetching; old keys expire. PostgreSQL moves to the target state for facts, when enrichment makes them relational (PostGIS, history). MongoDB was considered because the role lists it and rejected because Redis already covers the need. Classifier thresholds are hardcoded JSON per classifier for now (A-46), read through a `RuleSetProvider` interface whose static implementation exports `ruleSetVersion`; a configuration-service or database implementation drops in later without touching classifiers.

### Options

| | A — Incremental | B — Target state | C — Pragmatic |
| --- | --- | --- | --- |
| Runtime | One NestJS process | API deployment on EKS with horizontal pod autoscaling; a worker deployment runs the queue processors | One NestJS image; queue processors run in the same process behind a role flag |
| Platform | Docker Compose: api, redis | EKS via a Helm chart; Terraform for VPC, EKS, ElastiCache, ECR, and Aurora once facts need it | Docker Compose: api, redis; Helm chart skeleton committed but not deployed; Terraform described in the README |
| Store | Redis with AOF, two namespaces (facts, forecast cache), behind repository interfaces | ElastiCache for cache and facts; Aurora PostgreSQL for facts when enrichment lands | Redis with AOF, same as A |
| Redis | Store only; limiter, single-flight and throttler storage in-process | ElastiCache: store, BullMQ queues, throttler storage, daily fair-use counter | Redis container: store, BullMQ queues, throttler storage, daily fair-use counter |
| Refresh (ASR-3) | Stale-while-revalidate; in-request pipeline with in-memory single-flight | Stale-while-revalidate; BullMQ `ingest` jobs with `jobId` deduplication and queue limiter; `enrich` queue with a processor | Stale-while-revalidate; BullMQ `ingest` jobs with `jobId` deduplication and queue limiter; `enrich` queue registered, no processor |
| Degradation (ASR-4) | Store-first, 2 s timeout, one retry, partial response | Same, plus a circuit breaker per upstream | Same as A |
| Observability (NFR-5) | pino JSON logs, Terminus health | OpenTelemetry to Datadog, dashboards, alerts on the anomaly counter | pino, OpenTelemetry SDK with console or OTLP exporter, anomaly counter metric |
| Traceability (NFR-13) | Ranking event with versions; invariant checks | Same, plus a drift job against the golden set | Same as A, plus the counter as a metric |
| CI/CD (NFR-10) | GitHub Actions: lint, type check, Vitest with a redis service, image build | Adds push to ECR and `helm upgrade` | Vitest with a redis service, image build, `helm lint` |
| Stack shown | TypeScript, NestJS, GraphQL, Redis, Vitest, GitHub Actions, Docker | Adds Kubernetes, Helm, Terraform, ElastiCache, Aurora, Datadog, Lambda and SQS as the serverless variant | Adds BullMQ, a Helm chart and OpenTelemetry |
| Effort | About 2.5 hours | Two to three days | About 4.5 hours, phased so each phase leaves a working service |
| Ceiling | Single instance | Horizontal scale | Single instance now; every Redis-backed piece is already safe for multiple instances |

### Coverage matrix

Mechanism common to all options, then the option that differs.

| Requirement | Mechanism | Differs |
| --- | --- | --- |
| FR-1 resolve place | Geocoding adapter writes a location fact | — |
| FR-2 seven days | Forecast adapter requests the window; store keyed by location and window | — |
| FR-3 four activities | Four classifiers registered | — |
| FR-4 rank per activity | Ranking service sorts the seven days per classifier, rank 1 is best | — |
| DF-1 ambiguity | Geocode with count 5; first match used, alternatives returned | — |
| DF-2 unknown | No results maps to a `NOT_FOUND` GraphQL error via an exception filter | — |
| DF-3 not applicable | Applicability flag and reason in the classifier output | — |
| DF-4 inputs and reason | Classifier output carries the signal values it used | — |
| DF-5 data age | fetched-at and stale flag on every response | — |
| DF-6 per-source failure | Partial flag; marine failure degrades surfing to unavailable | — |
| NFR-1 timeliness | TTL from configuration plus window check; stale-while-revalidate | A: in-process single-flight; B, C: BullMQ `jobId` deduplication |
| NFR-2, NFR-3 performance | Store-first read; one key lookup per location and window | — |
| NFR-4 availability | Adapter timeouts, one retry, exception filter, partial response | B adds a circuit breaker |
| NFR-5 fault detection | pino, Terminus, OpenTelemetry | Exporter target differs |
| NFR-6 testability | Vitest unit; integration against a redis service; schema snapshot; end-to-end over `fetch` with stubbed adapters; autocannon smoke test | — |
| NFR-7 extensibility | Classifier module plus one registry entry; enum from registry | — |
| NFR-8 LLM-ops | Not built; classifier contract is async-capable | — |
| NFR-9 upstream access | Outbound limiter and single-flight | A: in-memory token bucket and map; B, C: BullMQ queue limiter plus a daily Redis counter, `jobId` deduplication |
| NFR-10 deployability | Dockerfile, Compose, GitHub Actions | C Helm skeleton; B full Helm and Terraform |
| NFR-11 provider neutrality | Adapter interface; zod-validated payload pinned to a schema version; raw snapshot stored; versioned key prefix, drift means refetch | — |
| NFR-12 security | Zod schemas on arguments via `nestjs-zod`; ThrottlerModule | Throttler storage in-memory in A |
| NFR-13 traceability | Ranking event with provider, fetched-at, classifier and rule-set versions; invariant checks; anomaly counter | B adds alerts and a drift job |

### ASR coverage

| Requirement | A | B | C |
| --- | --- | --- | --- |
| ASR-1 Classifier contract and registry | satisfies | satisfies | satisfies |
| ASR-2 Provider-neutral signal model | satisfies | satisfies | satisfies |
| ASR-3 Refresh under fair use | satisfies: stale-while-revalidate, in-process single-flight | satisfies | satisfies |
| ASR-4 Degradation on upstream failure | satisfies | satisfies | satisfies |
| ASR-5 Location facts and enrichment seam | satisfies | satisfies | satisfies |
| Goal 5 company stack shown | partial | satisfies | satisfies in code, Kubernetes and Terraform as described path |
| Goal 3 focus and the one-evening box | satisfies | does not satisfy | satisfies only if phased with cut lines |

### Sensitivity points

- Refresh strategy: stale-while-revalidate fixes warm latency and bounds freshness to one request past the TTL; single-flight placement decides whether that holds under more than one instance.
- Ingest execution: the queue decides durability of revalidation, correctness of single-flight and limiting under more than one instance, and where enrichment attaches.
- Compute-on-read: raises modifiability; small per-read cost.
- Pinned provider schema: raises availability and traceability under upstream change; adds a fixture-maintenance cost.

### Tradeoff points

One row per choice. "Serves" names the requirements the choice addresses. Preferences here are tactic-level; the option selection is Step 4.

| Axis | Choice | Pros | Cons | Serves | Preferred |
| --- | --- | --- | --- | --- | --- |
| Refresh | Blocking refetch when stale | Simple; always fresh | Caller waits upstream latency on every expiry | NFR-1 | |
| Refresh | Stale-while-revalidate | Warm latency always; one request stale and flagged; fair-use friendly; no infrastructure | Needs single-flight; one stale response per expiry | NFR-1, NFR-2, NFR-3, NFR-9; ASR-3, ASR-4; DF-5 | yes |
| Refresh | Scheduled refresh of known locations | Never stale | Refetches locations nobody asks for; queue and worker; burns fair use | NFR-1 | no, rejected at Gate 3 |
| Refresh | Incremental delivery (`@defer`) | Cached then fresh in one response | Client must support incremental delivery; complexity | NFR-1, NFR-2 | later option |
| Scoring | Compute on read | Store is pure signals; a classifier change needs no re-score | 28 classifier calls per read, negligible | ASR-1, ASR-2; NFR-7 | yes |
| Scoring | Precompute at refresh | Cheapest read | Re-score on every classifier change; store couples to classifier version | NFR-2 | |
| Scoring | Cache results in Redis | Cheap read, no coupling | Invalidation on refresh and on classifier version | NFR-2 | later, if measured |
| Ingest execution and limiting | In-request promise, in-memory single-flight and token bucket | No dependency | Lost on restart; wrong under more than one instance; limiter and lock are hand-written | NFR-9, NFR-12 | A only |
| Ingest execution and limiting | BullMQ jobs on Redis | Durable, deduplicated by job id, queue limiter, retry with backoff, lifecycle events; enrichment is a second queue; processors move to a worker unchanged | One more Nest module; queue lifecycle in tests; per-minute limiter only, daily cap needs a counter | ASR-3, ASR-4, ASR-5; NFR-5, NFR-9, NFR-13 | yes, B and C |
| Ingest execution and limiting | Lambda behind SQS | Serverless scale; isolation per job | Different runtime from the API; cold starts; local run needs emulation | ASR-3; NFR-10 | target-state variant, not chosen |
| Inbound limiting | ThrottlerModule with Redis storage; gateway in production | Correct under scale; gateway offloads later | None material | NFR-12 | yes |
| Store | Redis only, AOF persistence | One container; native TTL; hosts the BullMQ queues; no migrations; drift is a key version bump and a refetch | Facts durability rests on AOF; no relational queries when facts grow; may read as "just a cache" | ASR-3, ASR-4; NFR-9, NFR-12; goal 3 | yes, A and C |
| Store | Redis plus PostgreSQL | Durable relational facts; PostGIS and history for enrichment; Aurora path | Migrations, a second container, more code for data that does not exist yet | ASR-5 future; goal 5 | B, when enrichment lands |
| Store | MongoDB | Flexible documents | Nothing Redis does not already give here | ASR-2 | no |
| Runtime | One image, roles by flag | One deployable; stale-while-revalidate needs no worker | Future enrichment jobs would share the process | NFR-10; A-25 | yes |
| Runtime | API plus worker | Isolates background load | Second deployable for work that does not exist yet | NFR-10 | B, for enrichment only |
| Schema | Code-first | Enum from registry; types shared | SDL is generated, less readable | ASR-1; R-8 | yes |
| Schema | SDL-first | Readable contract file | Enum hand-maintained; drifts from the registry | FR-4 | |
| Validation | Zod via `nestjs-zod` | One schema per boundary; types inferred end to end | Smaller Nest ecosystem than class-validator | NFR-11, NFR-12; R-9 | yes |
| Validation | class-validator | Nest default | Decorators duplicate types; no payload validation | NFR-12 | |
| Tests | Vitest | ESM-native, fast, Jest-compatible API | Not the name in the role | NFR-6 | yes |
| Tests | Jest | Named in the role | Slower; ESM friction | NFR-6 | swap if asked |
| Deployment | Compose to run plus a Helm skeleton | Reviewer runs in one command; stack shown | Helm chart unexercised | NFR-10; goal 5 | yes, option C |
| Deployment | Helm on EKS with Terraform | Full target | Days, not an evening | NFR-10; goal 5 | option B |
| Payload storage | Raw snapshot plus signals | Replay, drift detection | Storage volume | NFR-11, NFR-13; R-9 | yes |
| Payload storage | Signals only | Lean | No replay | NFR-11 | |

### Hypotheses each option depends on

- A and C: H-1, H-3, H-6, H-5. If H-3 is refuted, surfing applicability needs a second signal; the classifier contract absorbs it. If H-1 is refuted, ASR-5 is the landing zone for enrichment.
- B: all six, plus operational assumptions not on the list (ElastiCache availability, queue semantics, cluster access).
- Tier-2 incremental delivery depends on H-7.

### Risk Register (v1)

| ID | Risk | Probability × Impact | Mitigation | Status |
| --- | --- | --- | --- | --- |
| R-1 | NestJS, Redis, BullMQ, a Helm chart and the testing pyramid do not fit one evening. | H × M | Step 5 phases each leave a working service; BullMQ replaces hand-written lock and limiter code, so it is net neutral; Helm and the performance smoke test are late phases cut with a README line. | open |
| R-2 | Outdoor and indoor sightseeing scores computed from weather alone, with no location facts, are judged naive. | M × M | A-23 stated; ASR-5 seam; H-1 golden set; README. | open |
| R-3 | The marine-null coastal heuristic is wrong for lakes and estuaries. | M × L | H-3 spike; the reason text says "no marine data", not "inland". | open |
| R-4 | Fair-use limit hit during review. | L × M | Outbound limiter, single-flight, store-first reads. | open |
| R-5 | In-process limiter and single-flight fail under multiple instances. | L × M | Interfaces; BullMQ job deduplication and queue limiter already hold across instances in B and C. | open |
| R-6 | Queue processors in the API process complicate test lifecycle. | M × L | Unit tests stub the queue; integration tests run processors against the redis service and await job completion; processors disabled by configuration where not needed. | open |
| R-7 | Scoring thresholds look arbitrary to the reviewer. | H × L | One rule file per activity with a rationale per threshold; H-1. | open |
| R-8 | The GraphQL schema hard-codes the four activities and the extensibility claim fails. | L × H | Activity enum generated from the registry; a QAS-7 test registers a fake activity. | open |
| R-9 | Open-Meteo changes its response shape and scores silently drift. | L × H | Payloads validated against a pinned schema version at the adapter; raw snapshot stored; versioned key prefix so drift means a refetch, not a migration; failure is an anomaly event and takes the ASR-4 path; optional live contract job in CI. | open |
| R-10 | NestJS boilerplate eats the time box. | M × M | Five modules only (location, weather, ranking, api, infra); CLI generators; no custom decorators. | open |
| R-11 | Reviewers read Redis as "just a cache" against the brief's rule to persist the data. | M × M | README explains the store model, the two namespaces and AOF persistence; repository interfaces show where PostgreSQL lands. | open |

> **Review Gate 3** — passed 2026-10-14. Options accepted as characterised: NestJS throughout; Redis with AOF as the only store; stale-while-revalidate; BullMQ ingest and enrich queues in B and C; Zod, Vitest; `@defer` as tier 2 behind H-7.

## Step 4 — Recommendation + ADR

*Not started.*

## Step 5 — Detailed Design + Tasking

*Not started.*

---



## Living Artifacts

### Assumptions Register

| ID | Assumption | Rationale | Status |
| --- | --- | --- | --- |
| A-0 | "LLM-ops practices" means production practices for an LLM layer. The only LLM use in view is an LLM-assisted classifier for activity suitability where deterministic rules fall short; it is a Step 3 option, never added for show, and follows those practices if built. | Confirmed by the candidate at Gate 0. | confirmed 2026-10-14 |
| A-1 | Open-Meteo behaviour verified on 2026-10-14 (variables, null marine data inland, limits) stays valid for the exercise. | Verified by live calls; recorded in Step 1. | confirmed 2026-10-14 |
| A-2 | The reviewer's machine has Docker and a current Node LTS. | Typical for an engineering reviewer; the README states both. | open |
| A-3 | The API needs no authentication for the exercise. | Brief is silent; adding auth would not change the architecture. | open |
| A-4 | A single process with a local store is acceptable for the exercise; horizontal scale is a production-path note. | One-evening time box; no load requirement stated. | open |
| A-5 | "Next 7 days" means today plus six days in the location's local timezone. | Matches Open-Meteo's default window with `timezone=auto`. See OQ-7. | open |
| A-6 | Scores are rule-based 0–100 per activity per day, with documented thresholds; no ML. | Explainable, testable, fits the time box. See OQ-2. | open |
| A-7 | Ranking is per activity across the 7 days (rank 1 = best day). A per-day view of activities can be derived from the same scores. | Reads the brief literally: "ranks how good the next 7 days will be for each activity". See OQ-1. | open |
| A-8 | Skiing uses the queried location's own forecast; no search for a nearby resort. Low or absent snow signal marks skiing not applicable rather than inventing data. | Nearby-resort lookup is a product feature outside the brief. See OQ-3. | open |
| A-9 | Surfing is not applicable where the Marine API returns nulls; no nearest-coast search. | Same reasoning as A-8. See OQ-4. | to verify (H-3) |
| A-10 | Ambiguous names resolve to Open-Meteo's first result; alternatives are returned; an optional country filter is accepted. | Population-ordered first hit matches user expectation most of the time; alternatives keep it honest. See OQ-5. | to verify (H-6) |
| A-11 | Refresh TTL defaults to 6 hours, configurable. | Models update every 1–6 hours; a 7-day outlook changes slowly. See OQ-6. | to verify (H-4) |
| A-12 | Metric units; English place names. | Open-Meteo defaults; brief is silent. See OQ-8, OQ-10. | open |
| A-13 | Indoor sightseeing is always acceptable and scores higher when outdoor conditions are poor. | Reasonable reading of the activity; cheap to overturn. See OQ-12. | open |
| A-14 | An unknown place name returns a typed not-found error rather than an empty result. | Derived behaviour DF-2; brief is silent. | open |
| A-15 | Each score exposes the weather inputs it was computed from. | Derived behaviour DF-4; serves the usability concern of score transparency. | open |
| A-16 | Each response carries the fetched-at time of the data it used. | Derived behaviour DF-5; follows from persist-and-refresh. | open |
| A-17 | One-command start on a clean clone, under 2 minutes, no key or account, is the deployability bar. | Proposed measure for NFR-2. | open |
| A-18 | Warm read p95 under 300 ms with zero upstream calls; cold read under 3 s with at most three calls. | Proposed measure for NFR-3; the brief gives no numbers. | to verify (H-5) |
| A-19 | On upstream failure, stale stored data is served with a flag; upstream timeout 2 s with one retry; with an empty store the answer is a typed `UPSTREAM_UNAVAILABLE` with a retry hint and the resolved location; marine-only failure degrades surfing only and flags the response partial. | Proposed measure for NFR-4. | open |
| A-20 | Logging each upstream call and refresh, plus a health endpoint, is enough observability for the exercise. | Proposed measure for NFR-5. | open |
| A-21 | The testing bar is the full pyramid without the live upstream: unit, integration on recorded fixtures, schema and contract, one end-to-end query with a stubbed upstream, all in CI on every push. A performance smoke test verifies the warm and cold read numbers; it is optional in CI for the exercise and a scheduled gate on the production path. | Proposed measure for NFR-6; goal 5. | open |
| A-22 | Adding an activity means one new classifier module plus registration, with no change to ingest, store, API, or existing classifiers. | Proposed measure for NFR-7; the growth direction was confirmed by the proxy product manager at Gate 1. | open |
| A-23 | Suitability for the four activities in scope is computable from weather and geo data alone; no points-of-interest enrichment is needed. | Keeps the exercise within Open-Meteo. See OQ-16. | to verify (H-1) |
| A-24 | Designed for interactive use: one reviewer, tens of requests per minute, a handful of locations. | Cross-cutting concern; production path recorded in 1a. | open |
| A-25 | Process kept stateless; single process, single store. | Cross-cutting concern; production path recorded in 1a. | open |
| A-26 | None; open on localhost; no user data. | Cross-cutting concern; production path recorded in 1a. | open |
| A-27 | Outbound limiter toward Open-Meteo at the fair-use limits (NFR-9). Inbound per-client limiter, configurable, on by default (NFR-12). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-28 | Every input validated at the API boundary: length, charset, bounds; typed errors; dependencies pinned; introspection on for the reviewer (NFR-12). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-29 | Additive schema evolution; deprecations for breaking changes. | Cross-cutting concern; production path recorded in 1a. | open |
| A-30 | Latest forecast per location only. Classifier outputs (inputs, score, reason) logged as structured events. Each event carries the classifier and rule-set version (NFR-13). | Cross-cutting concern; production path recorded in 1a. | open |
| A-31 | Place names only; no identity; no client addresses in logs. | Cross-cutting concern; production path recorded in 1a. | open |
| A-32 | Single-flight per location: in-memory map in A; BullMQ `jobId` deduplication in B and C (NFR-9). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-33 | Store treated as a rebuildable cache of upstream data; loss means refetch. | Cross-cutting concern; production path recorded in 1a. | open |
| A-34 | Forecast keyed by location and forecast window in local dates; upsert on refresh; stale when the window no longer covers today, regardless of TTL; the key is provider-neutral. | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | open |
| A-35 | Local Docker Compose. | Cross-cutting concern; production path recorded in 1a. | open |
| A-36 | Environment variables; `.env.example` lists every variable; no secrets exist. | Cross-cutting concern; production path recorded in 1a. | open |
| A-37 | Zero: free API, local store. | Cross-cutting concern; production path recorded in 1a. | open |
| A-38 | None; best effort. | Cross-cutting concern; production path recorded in 1a. | open |
| A-39 | Lockfile committed; CI installs with a frozen lockfile. | Cross-cutting concern; production path recorded in 1a. | open |
| A-40 | GitHub Actions on every push: lint, type check, tests, image build (NFR-10). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-41 | Provider interface; one adapter per provider; normalised daily signals in the store (NFR-11). Payloads are validated against a pinned provider schema version; drift is an anomaly. | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-42 | Every score carries provider, fetched-at, classifier id and version, and rule-set version; one structured event per ranking; invariant checks log anomalies with a counter. | Direction confirmed by the proxy product manager at Gate 2; measure proposed. | confirmed 2026-10-14 |
| A-43 | The data model has two storage classes from day one, a forecast cache (TTL, window-keyed) and long-lived location facts of which the geocoding result is the first; they are namespaces with different TTL policy, not necessarily different engines. | Direction confirmed by the proxy product manager at Gate 2; keeps the enrichment path open without a migration. | confirmed 2026-10-14 |
| A-44 | Evaluating indoor and outdoor attractions (points of interest, museums, walkability) is out of scope; suitability uses weather and geo data only. Adding attractions needs a new data-collection pipeline on the ASR-5 seam. | Confirmed by the proxy product manager at Gate 3; linked to R-2 and H-1. | confirmed 2026-10-14 |
| A-45 | One stale response per TTL expiry, flagged, while revalidation runs in the background, is acceptable. | Stale-while-revalidate chosen at Gate 3; the stale flag (DF-5) keeps it honest. | confirmed 2026-10-14 |
| A-46 | Hardcoded JSON thresholds per classifier are acceptable; they are read through a `RuleSetProvider` interface so a configuration-service or database source can replace the file without touching classifiers. | Confirmed by the proxy product manager at Gate 3. | confirmed 2026-10-14 |
| A-47 | Redis with AOF persistence is the only store for the exercise, holding both storage classes behind repository interfaces; PostgreSQL is the target-state store for facts once enrichment makes them relational. | Decided at Gate 3; the data is a cache plus small facts, so SQL buys nothing yet. See R-11. | confirmed 2026-10-14 |

### Open Questions Log

Questions a product manager would answer. Each carries the assumption chosen so the work can proceed.

| ID | Question | Assumption taken | Owner | Status |
| --- | --- | --- | --- | --- |
| OQ-1 | Rank days per activity, or rank activities per day? Traces to FR-4. | Per activity across days; per-day view derivable (A-7). | Product manager | open, assumption in force |
| OQ-2 | What makes a day "good" for each activity? Thresholds? | Rule-based heuristics with documented thresholds (A-6); exact rules fixed in Step 5. | Product manager | open, assumption in force |
| OQ-3 | Skiing for a city with no mountains (London)? | Score from the city's own forecast; flag not applicable when no snow signal (A-8). | Product manager | open, assumption in force |
| OQ-4 | Surfing for an inland city? | Not applicable, with the reason (A-9). | Product manager | open, assumption in force |
| OQ-5 | How to resolve an ambiguous name? | First result plus alternatives; optional country filter (A-10). | Product manager | open, assumption in force |
| OQ-6 | How fresh must data be? | TTL 6 h, configurable (A-11). | Product manager, Operator | open, assumption in force |
| OQ-7 | Does "next 7 days" include today? Traces to FR-2. | Yes, in local time (A-5). | Product manager | open, assumption in force |
| OQ-8 | Units? | Metric (A-12). | Product manager | open, assumption in force |
| OQ-9 | Refresh on read, or background job for known locations? | Stale-while-revalidate on read; no scheduled refresh (decided by the proxy product manager at Gate 3). | Operator | resolved 2026-10-14 |
| OQ-10 | Non-English place names? | English geocoding only (A-12). | Product manager | open, assumption in force |
| OQ-11 | Which store? | Redis with AOF persistence (A-47); PostgreSQL on the target state for facts. | Candidate | resolved 2026-10-14 |
| OQ-12 | Is indoor sightseeing ever "bad"? | Never bad; better when outdoors is worse (A-13). | Product manager | open, assumption in force |
| OQ-13 | What should an unknown place name return? | Typed not-found error (A-14). | Product manager | open, assumption in force |
| OQ-14 | Should the API expose why a day scored as it did? | Yes, inputs and a reason per score (A-15). | Product manager | open, assumption in force |
| OQ-15 | Should the consumer see how old the data is? | Yes, fetched-at per response (A-16). | Product manager | open, assumption in force |
| OQ-16 | Is activity suitability computable from weather and geo data alone, or does it need enrichment (for example points of interest from the web) and a classifier that is not deterministic? | Weather and geo only for the four activities in scope (A-23). An LLM-assisted classifier with enrichment is a Step 3 option. | Product manager | open, needs POC (H-1) |
| OQ-17 | Which of the cross-cutting concerns A-24 to A-41 must move from the production-path column into scope for a first production release? | None beyond what the exercise already does. | Product manager | open, assumption in force |
| OQ-18 | Is there point-of-interest geodata for sightseeing suitability, and if so from which source: a deterministic one (OpenStreetMap Overpass, Wikidata) or LLM enrichment? | Weather and geo only for the exercise (A-23). The data model separates location facts from the forecast cache so either enrichment path lands without a migration (A-43). A proof of concept is deferred and logged as a risk in Step 3. | Product manager | open, needs POC (H-2) |

### Quality Attribute Scenarios

Recorded under Step 1a; refined in Step 2.

### Utility Tree

Recorded under Step 2a; closed at Step 3.

### Hypotheses to Verify

Assumptions that can be tested cheaply are not decided ad hoc; they are listed here with a verification method and a time. Started at Step 2, updated through Step 5, closed at Step 5. Anything still unverified at submission goes into the README as "what I would verify next".

| ID | Hypothesis | Linked | Verification | When | Status |
| --- | --- | --- | --- | --- | --- |
| H-1 | Suitability for the four activities is computable from weather and geo data alone. | A-23, OQ-16 | Golden set of five known cities and seasons (Chamonix in January, Biarritz in autumn, London in November, Dubai in July, Springfield, Missouri); scores match expectation. | Implementation, Step 5 | to verify |
| H-2 | Point-of-interest geodata for sightseeing is available from a deterministic source. | OQ-18 | Spike: Overpass query for POI counts in three cities; latency, licence (ODbL), coverage. | Post-exercise proof of concept | to verify |
| H-3 | Marine API nulls reliably mean "no surf" at this location. | A-9, DF-3 | Probe lake and estuary cities (Chicago, Toronto, Hamburg, Seattle) for nulls versus values. | Step 5 spike, cheap | to verify |
| H-4 | A 6 h TTL loses nothing against model update cadence. | A-11 | Fetch one city hourly for 6 h; compare daily values; churn stays below one score band. | Post-exercise | to verify |
| H-5 | Warm read p95 under 300 ms is achievable with the chosen store. | A-18 | Performance smoke test from NFR-6. | Implementation | to verify |
| H-6 | The first geocoding result is the expected place for common names. | A-10 | Spot-check ten ambiguous names against expectation. | Step 5 spike, cheap | to verify |
| H-7 | `@defer` incremental delivery works under the NestJS Apollo driver with the graphql-js version available. | Step 5 tier 2 | Spike: one deferred field on a throwaway schema; check the multipart response. | Step 5 spike, before tier 2 | to verify |

### Risk Register

Recorded under Step 3; updated at Step 4.
