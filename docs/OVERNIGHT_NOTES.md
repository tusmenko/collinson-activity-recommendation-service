# Overnight implementation notes

Written during the unattended implementation run on the night of 2026-10-15 to 2026-10-16. Two lists: questions that need the owner's answer in the morning, and assumptions taken so the work could continue. Everything here is also reflected in the registers or the README where it belongs; this file is the morning checklist.

## Open questions for the morning

| ID | Question | What was done meanwhile |
| --- | --- | --- |

## Assumptions taken overnight

| ID | Assumption | Why the choice was obvious enough to proceed |
| --- | --- | --- |
| <a id="on-1"></a>ON-1 | The upstream base URLs are environment variables (`UPSTREAM_GEOCODING_URL`, `UPSTREAM_FORECAST_URL`, `UPSTREAM_MARINE_URL`) with the Open-Meteo hosts as defaults; the design's D-2 table did not list them. | The stub upstream of D-10 and the `demo` Compose profile cannot work without them; adding three documented knobs is the smallest change. Added to D-2 in the design document. |
| <a id="on-2"></a>ON-2 | Agent worklogs under `.claude/worklogs/` stay untracked. | They are raw working notes; the committed documents and commit history are the "how you worked" evidence. The owner can choose to commit them. |
| <a id="on-3"></a>ON-3 | pnpm is the package manager (owner's instruction at 01:15 on 2026-10-15); the handoff and plan said npm. `pnpm-lock.yaml` is committed, CI installs with `--frozen-lockfile`, the Dockerfile enables pnpm through corepack. | Owner's instruction; nothing in the design depends on the package manager. The docs that say "npm" are left as written; this note is the record. |
| <a id="on-4"></a>ON-4 | Each phase is one pull request, squash-merged to `main` by the session once GitHub Actions is green and the session has reviewed the diff. | Owner's instruction at 01:25 on 2026-10-15; matches the plan's "one pull request per phase merged on green CI". |
| <a id="on-5"></a>ON-5 | Fixtures were recorded live once at 01:11 on 2026-10-15 with the exact requests the adapters make (eight days, hourly `snow_depth`), replacing the seven-day spike recordings from `/tmp/s6`. | The spike files lacked `snow_depth` and the eighth day; re-recording once costs 21 calls and gives fixtures that match the adapter contract byte for byte. |

## Progress log

| Time | Phase | Event |
| --- | --- | --- |
