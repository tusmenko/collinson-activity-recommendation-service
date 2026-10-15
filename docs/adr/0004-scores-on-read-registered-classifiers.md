# ADR-0004 — Scores computed on read by registered classifiers

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-14 |
| Addresses | [FR-3](../arch/02-requirements.md#fr-3), [FR-4](../arch/02-requirements.md#fr-4), [NFR-7](../arch/02-requirements.md#nfr-7), [NFR-13](../arch/02-requirements.md#nfr-13), [QAS-7](../arch/02-requirements.md#qas-7), [ASR-1](../arch/03-asrs.md#asr-1), [H-1](../arch/registers.md#h-1) |
| Supersedes | — |
| Design | [D-6](../ACTIVITY_RANKING_DESIGN.md#d-6), [D-6.1](../ACTIVITY_RANKING_DESIGN.md#d-61-provisional-thresholds) |

**Context.** The brief asks for a ranking of each day for each of four activities. Classifiers are the confirmed growth point (Gate 1), and the thresholds are the main product question still open ([OQ-2](../arch/registers.md#oq-2)). A rule change must not need a re-ingest, and a new activity must not touch ingest, store or API.

**Decision.** The store holds daily signals only; scores are computed on every read. Each activity is a classifier exporting `id`, `version`, `requires` and `score`, registered once in the `RankingModule` classifier list; the GraphQL `Activity` enum is built from the registry at startup. Thresholds live in one JSON file per classifier, read through `RuleSetProvider` with a `ruleSetVersion`. A factor scores 100 in its good band, 0 in its poor band and 50 between; the day is the weighted mean, capped at 30 when a factor of weight 2 or more is poor; indoor sightseeing has a floor of 40.

**Rationale.**

- The store stays pure signals, so a rule or classifier change needs no re-ingest; 28 classifier calls per read cost nothing measurable.
- Adding an activity is one folder plus one registration ([NFR-7](../arch/02-requirements.md#nfr-7), [QAS-7](../arch/02-requirements.md#qas-7)); a test registers a fake activity ([R-8](../arch/04-options.md#r-8)).
- Every score carries the classifier and rule-set versions ([NFR-13](../arch/02-requirements.md#nfr-13)).
- The golden set closed [H-1](../arch/registers.md#h-1) once the deal-breaker cap was added: a weighted mean alone let Dubai at 38 °C score 78 for outdoor sightseeing.

**Alternatives rejected.**

- Precomputed scores at refresh: the cheapest read, but the store couples to classifier versions and every rule change means a re-score.
- Machine learning: no labelled data, and not explainable within the time box ([A-6](../arch/registers.md#a-6)).
- Thresholds in code: a tuning change becomes a code change, and no configuration service or database could replace them ([A-46](../arch/registers.md#a-46)).

**Consequences.**

- Easier: tuning is a JSON edit with a note per threshold; an LLM-assisted classifier fits the asynchronous contract ([NFR-8](../arch/02-requirements.md#nfr-8)).
- Harder: thresholds look arbitrary without their notes ([R-7](../arch/04-options.md#r-7)).
- Accepted: the cap makes cold days (tmax under 8 °C) poor for outdoor sightseeing.
