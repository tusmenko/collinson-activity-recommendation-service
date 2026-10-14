# Activity Ranking Service — conventions for AI sessions

Read `docs/IMPLEMENTATION_HANDOFF.md` first; it lists the documents in order. The architecture is decided and recorded in `docs/adr/`; do not re-open it in code. Follow `docs/CODING_STANDARDS.md`; the tools enforce it. Write the failing test first, using the test ids from `docs/ACTIVITY_RANKING_TEST_PLAN.md`. Never call Open-Meteo from tests; use the stub upstream and recorded fixtures. Never commit `private/`. One pull request per phase of `docs/arch/06-plan.md`, merged only on green CI. Log every cut with its reason in the README.
