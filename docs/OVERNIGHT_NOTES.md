# Overnight implementation notes

Written during the unattended implementation run on the night of 2026-10-14 to 2026-10-15. Two parts: questions that need the owner's answer, and the progress log. Technical decisions taken overnight are recorded in [D-12](ACTIVITY_RANKING_DESIGN.md#d-12) of the design document and in the [ADR log](adr/README.md).

## Open questions for the morning

| ID | Question | What was done meanwhile |
| --- | --- | --- |
| <a id="oq-n1"></a>OQ-N1 | Branch protection on `main` (required checks: static, unit, integration, schema, e2e, coverage, image, compose-health, helm-lint; admins exempt) was not set: the session's tooling declined the GitHub settings change. Set it from the repository settings page in the morning, or leave `main` open. | Every phase still merges only after a green run of every CI job, enforced by the session rather than by GitHub. |
| <a id="oq-n2"></a>OQ-N2 | The HTTPS remote rejects pushes that add workflow files because the stored GitHub token lacks the `workflow` scope. Refresh the token with that scope, or switch the remote to SSH. | The session pushes over SSH with the explicit SSH URL; the remote URL was left unchanged. |

## Progress log

| Time | Phase | Event |
| --- | --- | --- |
| 2026-10-15 01:34 | 0 | PR #1 merged on green CI (nine jobs, 14 to 38 s each); compose health green in 31 s locally and 38 s in CI. |
| 2026-10-15 01:55 | 1 | Location and adapters built: 79 tests (22 unit, 56 integration, 1 e2e); location 98.9 % lines, weather 100 % lines. Deviations recorded in the commit body. |
| 2026-10-15 02:05 | 1 | PR #2 merged on green CI. Phases 2 and 3 started in parallel (phase 3 depends only on `DaySignals` and the fixtures). |
| 2026-10-15 02:25 | 2 | Store, queue, ingest and degradation built: 106 tests (26 unit, 79 integration in 10 s, 1 e2e); weather 98.3 % lines. I-QUEUE-2 measured 3029 ms for 20 limited jobs. Plain `bullmq` providers instead of `@nestjs/bullmq`; `OUTBOUND_LIMIT_WINDOW_MS` added as a test knob ([D-12](ACTIVITY_RANKING_DESIGN.md#on-6)). |
| 2026-10-15 02:45 | 2 | PR #3 merged on green CI. |
| 2026-10-15 02:55 | 3 | Classifiers, registry, rules, ranking and events built in parallel with phase 2 and rebased: 166 tests; ranking 100 % lines, 97.9 % branches; H-1 closed ([D-12](ACTIVITY_RANKING_DESIGN.md#on-7)). |
| 2026-10-15 03:15 | 3 | PR #4 merged on green CI. |
| 2026-10-15 03:35 | 4 | GraphQL API built: 203 tests (99 unit, 80 integration, 3 schema, 21 e2e); api 92.3 % lines; demo query for Biarritz answers cold in 238 ms and warm in 9 ms against the stub. |
| 2026-10-15 03:50 | 4 | PR #5 merged on green CI. |
| 2026-10-15 04:10 | 5 | OpenTelemetry metrics, Helm chart skeleton (`helm lint` clean), load job and README built: 207 tests. Load job against the `demo` profile: warm p95 31.8 ms, max 380 ms, 19,265 requests in 10 s at 50 connections, zero 5xx, zero GraphQL errors in 21 samples, cold Dubai read 143 ms. |
| 2026-10-15 04:25 | 5 | PR #6 merged on green CI. The `main` run with the real load job passed on the GitHub runner: warm p95 47.9 ms, max 357 ms, 14,583 requests, zero errors, cold 348 ms. |
| 2026-10-15 04:35 | — | Fresh clone of `main` into an empty directory: `docker compose up --build` healthy in 25 s; the README's Biarritz query answered from live Open-Meteo (skiing not applicable, surfing 79 to 100, outdoor 30 to 100, indoor 40 to 50); no `private/` in the clone. |
| 2026-10-15 | — | Owner's review, follow-up pass. Decisions: OQ-2 stays open (product decision; default thresholds stand); OQ-3 resolved with an 800 m elevation gate ahead of the snow-depth gate (Chamonix at 1060 m qualifies, London at 25 m does not); OQ-4, OQ-5, OQ-7 and OQ-13 resolved as assumed; OQ-6 resolved (6 h follows the slowest Open-Meteo model refresh); OQ-12 reworded and left open. Changes: the three upstream URL variables (ON-1) became one optional `UPSTREAM_BASE_URL`, unset meaning the real hosts (D-2; now [D-12](ACTIVITY_RANKING_DESIGN.md#a-53)); `GET /health` returns `{ status, details }` only; pnpm moved from ON-3 to A-52 (now in [DEVELOPMENT.md](DEVELOPMENT.md#toolchain)); ON-1 to ON-4 removed because this table now holds only technical assumptions. |
| 2026-10-15 | — | Docs pass: ADR-0002 to ADR-0009 added, one record per architecturally significant decision, with the index showing what each addresses; implementation decisions ON-5 to ON-10 and A-53 moved to design [D-12](ACTIVITY_RANKING_DESIGN.md#d-12); the assumptions register split into product, architecture and exercise-scope tables; pnpm (A-52) moved to [DEVELOPMENT.md](DEVELOPMENT.md#toolchain); this file trimmed to the open questions and the progress log. |
