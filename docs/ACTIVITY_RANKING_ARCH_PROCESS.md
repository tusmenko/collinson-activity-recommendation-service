# Activity Ranking Service — Architecture Process

SEI-style collaborative architecture process for the Collinson Lead Engineer take-home. This document is a living record: every step's artifact lands here, and it ships in the public repo as part of the "how you worked" deliverable.

Status legend: `open` (not started), `in progress`, `gate pending`, `passed`, `revised`.


| Step    | Artifact                             | Status                      |
| ------- | ------------------------------------ | --------------------------- |
| Stage 0 | Feature context: inputs, goals, plan | passed (revised 2026-10-14) |
| Step 0  | Stakeholder map                      | passed 2026-10-14           |
| Step 1  | Requirements + QAS + baseline        | in progress                 |
| Step 2  | Utility tree + ASRs + tactics        | open                        |
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
2. **Apply LLM-ops practice if an LLM layer is designed.** An LLM inside the service is a Step 3 option, not a requirement, and is not added for show. If an option includes one, it must carry the production practices that make LLM features operable: versioned prompts, observability of calls (latency, tokens, cost, traces), a gateway or provider abstraction, structured and validated outputs, and durable execution for long-running or retried work. The same practices are described as a production path if the layer is designed but not built. The development-time AI tooling that drove this process (agent and skill definitions, conventions file) is committed as part of goal 1, not as LLM-ops.



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
| S0-4 | This document ships publicly. Keep the reviewers' personal names in the stakeholder map, or reduce them to roles before the repo goes public? | Default: reduce to roles in the pre-publish pass (slot 6) unless told to keep them.                                                    | open                |


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



### 1a Requirements

*Not started.*

### 1b Baseline

*Not started. Greenfield: the baseline is the absence of a system plus the Open-Meteo API as the upstream.*

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

*Started at Step 1.*

### Open Questions Log

See stage 0 table above; product questions added from Step 1.

### Quality Attribute Scenarios

*Started at Step 1.*

### Utility Tree

*Started at Step 2.*

### Risk Register

*Started at Step 3.*