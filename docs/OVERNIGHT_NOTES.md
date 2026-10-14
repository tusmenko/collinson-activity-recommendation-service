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

## Progress log

| Time | Phase | Event |
| --- | --- | --- |
