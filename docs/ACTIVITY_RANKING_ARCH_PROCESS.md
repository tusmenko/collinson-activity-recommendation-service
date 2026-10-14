# Activity Ranking Service — Architecture Process

SEI-style collaborative architecture process for the Collinson Lead Engineer take-home. This document is a living record: every step's artifact lands here, and it ships in the public repo as part of the "how you worked" deliverable.

Status legend: `open` (not started), `in progress`, `gate pending`, `passed`, `revised`.


| Step    | Artifact                             | Status                      |
| ------- | ------------------------------------ | --------------------------- |
| Stage 0 | Feature context: inputs, goals, plan | passed (revised 2026-10-14) |
| Step 0  | Stakeholder map                      | passed 2026-10-14           |
| Step 1  | Requirements + QAS + baseline        | passed 2026-10-14           |
| Step 2  | Utility tree + ASRs + tactics        | in progress                 |
| Step 3  | Solution options                     | open                        |
| Step 4  | ADR + design                         | open                        |
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
| Operator (deploys and maintains the service) | Shane Patrick during review; the engineer who deploys and maintains it in production                                                | Starts with one command on a clean clone; deployable without manual configuration; refresh job observable; failures of the upstream visible and non-fatal; no secrets or accounts needed to run | Containerised run; configuration by environment; logs and health                                                    | None. Served by operability QAS and the production-path notes.                                                                                                                                                |
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

#### Non-functional requirements

| ID | Quality | Requirement | Source | Proposed measure | Assumption |
| --- | --- | --- | --- | --- | --- |
| NFR-1 | Freshness | Stored weather data is refreshed. | Brief: "how you model, store, and refresh it is part of the problem" | Served data no older than a TTL of 6 h plus one refresh cycle; TTL configurable | A-11 |
| NFR-2 | Operability | A reviewer can run the service from the README. | Brief: "how to run it"; Step 0, Operator | One command on a clean clone, under 2 minutes, no key or account | A-17 |
| NFR-3 | Performance | Reads answer quickly. | Step 0, API consumer: "fast response" | Warm read: zero upstream calls, p95 under 300 ms locally. Cold read: at most three upstream calls, under 3 s | A-18 |
| NFR-4 | Availability | Upstream failure does not take the service down. | Step 0, Operator: "failures of the upstream visible and non-fatal" | Serve stored data flagged stale; error only when nothing is stored; upstream timeout 2 s | A-19 |
| NFR-5 | Observability | Refresh activity and upstream calls are visible to the operator. | Step 0, Operator: "refresh job observable" | Each upstream call and refresh logged with latency and outcome; health endpoint | A-20 |
| NFR-6 | Testability | Scoring and integration are tested without the live API. | Step 0, Hiring manager: "robust and testable"; goal 5 | Scoring unit-tested; integration on recorded fixtures; CI runs lint, type check and tests on every push | A-21 |
| NFR-7 | Extensibility | A new activity can be added, including one that needs a new data signal, without changing ingest, store, or API code beyond registering the new activity classifier. | Proxy product manager at Gate 1, 2026-10-14: classifiers are the natural point of growth. | Adding an activity is one new classifier module plus registration; existing classifiers and tests untouched | A-22 |
| NFR-8 | LLM-ops | If an LLM-assisted classifier is built (OQ-16), it carries versioned prompts, call observability, provider abstraction and validated structured output. | Goal 6 | Applies only if the option is chosen in Step 3 | A-0 |
| NFR-9 | Upstream fair use | Outbound calls to Open-Meteo stay within the fair-use limits regardless of inbound load. | Fair-use constraint; proxy product manager at Gate 1, 2026-10-14: implement from the start. | Outbound limiter at 600 per minute, 5,000 per hour, 10,000 per day, configurable; single-flight per location so concurrent cold reads fetch once | A-27, A-32 |
| NFR-10 | Deployability | The service builds, tests and packages from CI with no manual steps; the production deploy path uses the stack named in the role. | Goal 5; role description: build, deploy and run systems end to end without manual configuration. | GitHub Actions on every push: lint, type check, tests, Docker image build. Deploy path described, not executed: image to a registry, Helm chart to EKS, Terraform for infrastructure, Datadog for telemetry | A-40 |
| NFR-11 | Integration extensibility | A weather or enrichment provider can be added or replaced behind a provider interface; the stored model is provider-neutral. | Proxy product manager at Gate 1, 2026-10-14: integrations are a natural point of extension. | Store holds normalised daily signals, not Open-Meteo payloads; one adapter per provider; swapping a provider touches the adapter and its fixtures only | A-41 |
| NFR-12 | Boundary protection | Every inbound request is validated and rate-limited at the API boundary before any store or upstream access. | Proxy product manager at Gate 1, 2026-10-14: validation is critical; inbound limits from the start. | Schema types plus explicit validation of length, charset and bounds; per-client token bucket, configurable; typed errors for malformed or over-limit requests; tests for both | A-27, A-28 |

#### Cross-cutting concerns

The brief is silent on these. Each row records what the exercise does and what is left to the production path, so a reviewer can see the concern was weighed either way. Rows that a stakeholder confirmed are routed to the NFR table.

| ID | Concern | In the exercise | Deferred to production |
| --- | --- | --- | --- |
| A-24 | Expected load | Designed for interactive use: one reviewer, tens of requests per minute, a handful of locations. | A load target; read-heavy traffic on popular cities absorbed by the store and TTL. |
| A-25 | Scalability | Process kept stateless; single process, single store. | Horizontal scale as a deployment concern. |
| A-26 | Authentication, authorisation | None; open on localhost; no user data. | Gateway or JWT at the edge. |
| A-27 | Rate limiting | Outbound limiter toward Open-Meteo at the fair-use limits (NFR-9). Inbound per-client limiter, configurable, on by default (NFR-12). | Gateway-level inbound limits; distributed limiter if multi-instance. |
| A-28 | Input validation and security | Every input validated at the API boundary: length, charset, bounds; typed errors; dependencies pinned; introspection on for the reviewer (NFR-12). | Depth and complexity limits; introspection off; dependency scanning. |
| A-29 | API versioning | Additive schema evolution; deprecations for breaking changes. | Same. |
| A-30 | Data retention and classifier evaluation | Latest forecast per location only. Classifier outputs (inputs, score, reason) logged as structured events. | Golden-dataset evaluation outside the running app, fed by the log; matters most for an LLM-assisted classifier. |
| A-31 | Privacy, PII | Place names only; no identity; no client addresses in logs. | Same. |
| A-32 | Refresh concurrency | Single-flight per location (NFR-9). | Distributed lock if multi-instance. |
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
| QAS-4 | Freshness | NFR-1 | Clock | Stored data passes the TTL | Refresh | Normal | Data refreshed on next read, or by background refresh for known locations | Served data never older than TTL plus one refresh cycle; TTL default 6 h, configurable |
| QAS-5 | Usability | DF-1 | API consumer | Queries "Springfield" | Geocoding adapter, API | Normal | Rank the best match; return its name, region, country; list up to 5 alternatives | Resolved location present in every response; alternatives present when more than one match |
| QAS-6 | Usability | DF-2 | API consumer | Queries a name with no match | API | Normal | Typed `NOT_FOUND` error naming the input | No forecast or marine call made; under 1 s |
| QAS-7 | Extensibility | NFR-7 | Developer | Adds a fifth activity, for example cycling, that needs wind and rain signals already stored | Classifier registry, API schema | Development | Write one classifier module, register it; the API exposes it | No change to ingest, store, or existing classifiers; existing tests pass unchanged; under 2 hours |
| QAS-8 | Operability | NFR-2 | Operator | Clones the repo and starts the service | Repo, container, store | Clean machine with Docker and Node | Service and store up, health endpoint green, playground reachable | One command; under 2 minutes; no keys or accounts |
| QAS-9 | Testability | NFR-6 | CI | Push to any branch | Pipeline | GitHub Actions | Lint, type check, unit, integration | Under 5 minutes; zero live calls to Open-Meteo |
| QAS-10 | Explainability | DF-4, DF-3 | API consumer | Asks why a day scored as it did | API response | Normal | Each score carries the input values and a reason label; non-applicable activities say why | Every score has at least its inputs and one reason; applicability flag always present |

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

*Not started.*

## Step 3 — Solution Options

*Not started.*

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
| A-9 | Surfing is not applicable where the Marine API returns nulls; no nearest-coast search. | Same reasoning as A-8. See OQ-4. | open |
| A-10 | Ambiguous names resolve to Open-Meteo's first result; alternatives are returned; an optional country filter is accepted. | Population-ordered first hit matches user expectation most of the time; alternatives keep it honest. See OQ-5. | open |
| A-11 | Refresh TTL defaults to 6 hours, configurable. | Models update every 1–6 hours; a 7-day outlook changes slowly. See OQ-6. | open |
| A-12 | Metric units; English place names. | Open-Meteo defaults; brief is silent. See OQ-8, OQ-10. | open |
| A-13 | Indoor sightseeing is always acceptable and scores higher when outdoor conditions are poor. | Reasonable reading of the activity; cheap to overturn. See OQ-12. | open |
| A-14 | An unknown place name returns a typed not-found error rather than an empty result. | Derived behaviour DF-2; brief is silent. | open |
| A-15 | Each score exposes the weather inputs it was computed from. | Derived behaviour DF-4; serves the explainability concern. | open |
| A-16 | Each response carries the fetched-at time of the data it used. | Derived behaviour DF-5; follows from persist-and-refresh. | open |
| A-17 | One-command start on a clean clone, under 2 minutes, no key or account, is the operability bar. | Proposed measure for NFR-2. | open |
| A-18 | Warm read p95 under 300 ms with zero upstream calls; cold read under 3 s with at most three calls. | Proposed measure for NFR-3; the brief gives no numbers. | open |
| A-19 | On upstream failure, stale stored data is served with a flag; upstream timeout 2 s. | Proposed measure for NFR-4. | open |
| A-20 | Logging each upstream call and refresh, plus a health endpoint, is enough observability for the exercise. | Proposed measure for NFR-5. | open |
| A-21 | Unit tests on scoring, fixture-based integration tests and CI on every push is the testing bar. | Proposed measure for NFR-6; goal 5. | open |
| A-22 | Adding an activity means one new classifier module plus registration, with no change to ingest, store, API, or existing classifiers. | Proposed measure for NFR-7; the growth direction was confirmed by the proxy product manager at Gate 1. | open |
| A-23 | Suitability for the four activities in scope is computable from weather and geo data alone; no points-of-interest enrichment is needed. | Keeps the exercise within Open-Meteo. See OQ-16. | open |
| A-24 | Designed for interactive use: one reviewer, tens of requests per minute, a handful of locations. | Cross-cutting concern; production path recorded in 1a. | open |
| A-25 | Process kept stateless; single process, single store. | Cross-cutting concern; production path recorded in 1a. | open |
| A-26 | None; open on localhost; no user data. | Cross-cutting concern; production path recorded in 1a. | open |
| A-27 | Outbound limiter toward Open-Meteo at the fair-use limits (NFR-9). Inbound per-client limiter, configurable, on by default (NFR-12). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-28 | Every input validated at the API boundary: length, charset, bounds; typed errors; dependencies pinned; introspection on for the reviewer (NFR-12). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-29 | Additive schema evolution; deprecations for breaking changes. | Cross-cutting concern; production path recorded in 1a. | open |
| A-30 | Latest forecast per location only. Classifier outputs (inputs, score, reason) logged as structured events. | Cross-cutting concern; production path recorded in 1a. | open |
| A-31 | Place names only; no identity; no client addresses in logs. | Cross-cutting concern; production path recorded in 1a. | open |
| A-32 | Single-flight per location (NFR-9). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-33 | Store treated as a rebuildable cache of upstream data; loss means refetch. | Cross-cutting concern; production path recorded in 1a. | open |
| A-34 | Forecast keyed by location and forecast window in local dates; upsert on refresh; stale when the window no longer covers today, regardless of TTL; the key is provider-neutral. | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | open |
| A-35 | Local Docker Compose. | Cross-cutting concern; production path recorded in 1a. | open |
| A-36 | Environment variables; `.env.example` lists every variable; no secrets exist. | Cross-cutting concern; production path recorded in 1a. | open |
| A-37 | Zero: free API, local store. | Cross-cutting concern; production path recorded in 1a. | open |
| A-38 | None; best effort. | Cross-cutting concern; production path recorded in 1a. | open |
| A-39 | Lockfile committed; CI installs with a frozen lockfile. | Cross-cutting concern; production path recorded in 1a. | open |
| A-40 | GitHub Actions on every push: lint, type check, tests, image build (NFR-10). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |
| A-41 | Provider interface; one adapter per provider; normalised daily signals in the store (NFR-11). | Direction confirmed by the proxy product manager at Gate 1; measure proposed. | confirmed 2026-10-14 |

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
| OQ-9 | Refresh on read, or background job for known locations? | Decided in Step 3. | Operator | open |
| OQ-10 | Non-English place names? | English geocoding only (A-12). | Product manager | open, assumption in force |
| OQ-11 | Which store? | Decided in Step 3. | Candidate | open |
| OQ-12 | Is indoor sightseeing ever "bad"? | Never bad; better when outdoors is worse (A-13). | Product manager | open, assumption in force |
| OQ-13 | What should an unknown place name return? | Typed not-found error (A-14). | Product manager | open, assumption in force |
| OQ-14 | Should the API expose why a day scored as it did? | Yes, inputs and a reason per score (A-15). | Product manager | open, assumption in force |
| OQ-15 | Should the consumer see how old the data is? | Yes, fetched-at per response (A-16). | Product manager | open, assumption in force |
| OQ-16 | Is activity suitability computable from weather and geo data alone, or does it need enrichment (for example points of interest from the web) and a classifier that is not deterministic? | Weather and geo only for the four activities in scope (A-23). An LLM-assisted classifier with enrichment is a Step 3 option. | Product manager | open, assumption in force |
| OQ-17 | Which of the cross-cutting concerns A-24 to A-41 must move from the production-path column into scope for a first production release? | None beyond what the exercise already does. | Product manager | open, assumption in force |

### Quality Attribute Scenarios

Recorded under Step 1a; refined in Step 2.

### Utility Tree

_Started at Step 2._

### Risk Register

_Started at Step 3._
