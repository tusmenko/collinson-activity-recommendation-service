# Activity Ranking Service — Architecture Process

SEI-style collaborative architecture process for the Collinson take-home. One file per step under `docs/arch/`, living registers in one file, ADRs in a numbered log, detailed design in a separate document linked from the ADR. Everything here ships in the public repo as the "how you worked" deliverable.

Status legend: `open`, `in progress`, `gate pending`, `passed`, `revised`. Assumptions may also be `to verify (H-n)`, pointing at the hypotheses list.

| Step | Artifact | File | Status |
| --- | --- | --- | --- |
| Stage 0 | Feature context: inputs, goals, plan | [arch/00-feature-context.md](arch/00-feature-context.md) | passed 2026-10-14, revised |
| Step 0 | Stakeholder map | [arch/01-stakeholders.md](arch/01-stakeholders.md) | passed 2026-10-14 |
| Step 1 | Requirements, QAS, environment baseline | [arch/02-requirements.md](arch/02-requirements.md) | passed 2026-10-14 |
| Step 2 | Utility tree, ASRs, tactics | [arch/03-asrs.md](arch/03-asrs.md) | passed 2026-10-14 |
| Step 3 | Solution options, tradeoff analysis, risks | [arch/04-options.md](arch/04-options.md) | passed 2026-10-14 |
| Step 4 | Recommendation, component diagram, design mapping | [arch/05-recommendation.md](arch/05-recommendation.md) | passed 2026-10-15 |
| Step 5 | Implementation plan | [arch/06-plan.md](arch/06-plan.md) | complete 2026-10-15 |
| Registers | Assumptions, open questions, hypotheses, risk pointer | [arch/registers.md](arch/registers.md) | living |
| ADR log | One record per architecturally significant decision; ADR-0001 chose the option, ADR-0002 to ADR-0009 record each decision inside it | [adr/README.md](adr/README.md) | ADR-0001 to ADR-0009 accepted |
| Handoff | Reading order, decisions in force, non-negotiables, environment, what to update | [IMPLEMENTATION_HANDOFF.md](IMPLEMENTATION_HANDOFF.md) | current |
| Standards | Principles, limits, layering, tools and gates | [CODING_STANDARDS.md](CODING_STANDARDS.md) | current |
| Test plan | Traceability matrix, coverage gates, fixtures, non-functional verification | [ACTIVITY_RANKING_TEST_PLAN.md](ACTIVITY_RANKING_TEST_PLAN.md) | current |
| Design | Detailed design implementing [ADR-0001](adr/0001-pragmatic-option-nestjs-redis-bullmq.md) ([D-1](ACTIVITY_RANKING_DESIGN.md#d-1) to [D-11](ACTIVITY_RANKING_DESIGN.md#d-11); implementation decisions in [D-12](ACTIVITY_RANKING_DESIGN.md#d-12)) | [ACTIVITY_RANKING_DESIGN.md](ACTIVITY_RANKING_DESIGN.md) | current |

Process rules, from Stage 0: one commit per gate on the architecture side and one per phase on the code side, with the decision in the commit message; product-manager questions logged with the assumption chosen and carried into the README; anything cut logged with its reason.
