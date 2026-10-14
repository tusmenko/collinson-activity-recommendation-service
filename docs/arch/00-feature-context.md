# Stage 0 — Feature Context

Part of the [architecture process](../ACTIVITY_RANKING_ARCH_PROCESS.md). Inputs, goals, constraints and the plan, fixed before Step 0.

## Problem statement

Build a backend service that accepts a city or town name and ranks how good each of the next 7 days will be for four activities: skiing, surfing, outdoor sightseeing, and indoor sightseeing. Weather data comes from Open-Meteo and must be persisted rather than fetched on every request; how it is modelled, stored, and refreshed is part of the problem. The API is GraphQL on Node.js, written in TypeScript. No front end. Storage is our choice.

The brief is deliberately loose. The reviewers grade the reasoning, the assumptions committed to, and the questions that would normally go to a product manager, above the code itself.

## Goals and success criteria

Ordered as the brief orders them, with one business driver above all of them.

1. **Pass the assignment.** This is a hiring exercise. Every other goal serves this one, and scope decisions are judged by whether they help a reviewer say yes.
2. **Reasoning is visible and followable.** This document, the assumptions register, the open questions log, and a readable commit history are the primary deliverable. Cuts and time-outs are recorded with a one-line reason rather than hidden.
3. **The service works and is explained.** A GraphQL endpoint answers the ranking query for a named city; data is persisted and refreshed; a short README covers what was built, how to run it, and the assumptions.
4. **Focused over exhaustive.** A small, well-reasoned submission beats a broad one. Anything not on the critical path is noted as a future step, not built.
5. **Survives a live walkthrough.** Final interview is 1h–1h30 screen-share with an Engineering Manager and a Principal Engineer, with questions on design and architecture decisions and possibly a few lines of live coding. Every decision here should be defensible out loud.

Two further goals confirmed by the candidate at the stage 0 gate:

1. **Show the company's stack in use.** Echo the job description stack where it is affordable in a day (TypeScript, GraphQL, Jest, TDD, GitHub Actions, containers, an observability mindset), and keep the engineering practice consistent with how the role is described (SEI-style design, testing pyramid, CI quality gates). Where it is not affordable (Kubernetes, Terraform, Kafka, Aurora), describe the production path in the README instead of building it.
2. **Apply LLM-ops practice if an LLM layer is designed.** An LLM inside the service is a Step 3 option, not a requirement, and is not added for show; the use case in view is classification of activity suitability where deterministic rules fall short, for example after enriching a location with points-of-interest data. If an option includes one, it must carry the production practices that make LLM features operable: versioned prompts, observability of calls (latency, tokens, cost, traces), a gateway or provider abstraction, structured and validated outputs, and durable execution for long-running or retried work. The same practices are described as a production path if the layer is designed but not built. The development-time AI tooling that drove this process (agent and skill definitions, conventions file) is committed as part of goal 1, not as LLM-ops.



## Inputs and source documents


| Source                   | What it gives us                                                                                                            | In repo?                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `ASSIGNMENT.md`          | The brief: scope, activities, stack, grading order                                                                          | Yes                               |
| Role context             | Public job description for the role: team shape, production stack, interview stages. Informs goal 5 only.                   | Not reproduced                    |
| Process constraints      | TypeScript mandatory; public GitHub repo; 5 working days; live walkthrough after review                                     | Summarised under Hard constraints |
| Open-Meteo Geocoding API | City or town name to coordinates, timezone, country; handles ambiguity by returning multiple matches                        | External                          |
| Open-Meteo Forecast API  | Daily and hourly weather variables up to 16 days: temperature, precipitation, snowfall, wind, cloud cover, UV, weather code | External                          |
| Open-Meteo Marine API    | Wave height, period, direction for coastal points; the only surfing-relevant signal                                         | External                          |


Open-Meteo is free for non-commercial use, needs no API key, and documents a fair-use limit of roughly 10,000 requests per day. Exact variables, limits, and the behaviour of the Marine API for inland coordinates are to be verified in Step 1, not assumed.

## Codebase findings

Greenfield. The repository has no commits. A `.gitignore` exists covering `node_modules`, build output, `.env*`, local SQLite files, logs, and editor files.

## Hard constraints

- Language: TypeScript. Runtime: Node.js. API style: GraphQL.
- Data source: Open-Meteo. Weather data must be persisted and refreshed, not fetched per request.
- No front end.
- Deliverable: public GitHub repo plus short README.
- Deadline: 5 working days from receipt on 2026-10-14. The candidate's own target is to finish on 2026-10-14 and send on 2026-10-15. The time box is therefore one working evening, which is the single strongest constraint on scope.
- Must be presentable in a live screen-share and runnable on a reviewer's machine.



## Plan and time budget

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



## Open questions (stage 0)

These are about the engagement itself, not the product. Product questions start in Step 1.


| #    | Question                                                                                                                                      | Resolution                                                                                                                             | Status              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| <a id="s0-2"></a>S0-2 | How far to echo the JD stack?                                                                                                                 | Build what fits in a day; describe the rest as a production path. Stack utilisation is an explicit goal, not a nice-to-have.           | resolved 2026-10-14 |
| <a id="s0-3"></a>S0-3 | What counts as "show how you worked"?                                                                                                         | This document, the assumptions and decisions trail, commit history, and the AI tooling files committed to the repo. No raw transcript. | resolved 2026-10-14 |
| <a id="s0-4"></a>S0-4 | This document ships publicly. Keep the reviewers' personal names in the stakeholder map, or reduce them to roles before the repo goes public? | Keep the names. | resolved 2026-10-14 |


Assumption carried into the Assumptions Register at Step 1:

- **A-0 (resolved 2026-10-14).** "LLM-ops practices" means the production practices for an LLM layer: prompt versioning, call observability, a gateway or provider abstraction, structured validated outputs, and durable execution (in the spirit of tools such as an LLM gateway, Pydantic AI, LangGraph, Temporal). An LLM inside the service remains a Step 3 option and is not added for show; if designed, it follows these practices. Development-time AI tooling committed to the repo is part of goal 1.


> **Stage 0 gate** — passed 2026-10-14, revised: finish today, send tomorrow; stack utilisation and LLM-ops as explicit goals; no transcript; names kept.
