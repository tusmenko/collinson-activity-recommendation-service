# ADR-0009 — Delivery: Compose to run, Helm as the production path, GitHub Actions as the gate

| Field | Value |
| --- | --- |
| Status | accepted |
| Date | 2026-10-15 |
| Addresses | [NFR-2](../arch/02-requirements.md#nfr-2), [NFR-10](../arch/02-requirements.md#nfr-10), [QAS-8](../arch/02-requirements.md#qas-8), [A-17](../arch/registers.md#a-17), [A-35](../arch/registers.md#a-35), [A-40](../arch/registers.md#a-40) |
| Supersedes | — |
| Design | [D-2](../ACTIVITY_RANKING_DESIGN.md#d-2), [D-11](../ACTIVITY_RANKING_DESIGN.md#d-11) |

**Context.** The reviewer clones and runs the service in one sitting, with no account or key ([NFR-2](../arch/02-requirements.md#nfr-2)). The role names Kubernetes, Helm and Terraform. One evening of build time rules out a real cluster.

**Decision.** `docker compose up --build` runs `api` and `redis` from one multi-stage image. The service listens on 4510, and `API_PORT` moves the host port. A Helm chart (Deployment, Service, HPA, ConfigMap, probes, and an optional worker Deployment running the queue processors) is committed and linted in CI, not deployed; `docker-compose.scale.yml` shows the worker split locally. GitHub Actions runs static checks, every test level, coverage gates, the image build, a Compose health check and `helm lint` on every pull request and push to `main`.

**Rationale.**

- One command on a clean clone: a fresh clone of `main` was healthy in 25 s, under the two-minute bar ([QAS-8](../arch/02-requirements.md#qas-8), [A-17](../arch/registers.md#a-17)).
- A non-default port avoids editors and dev servers that hold 3000; on 2026-10-15 an editor's port forward made every request to a healthy container return an empty reply.
- The Kubernetes path is shown and linted, so its shape can be reviewed without a cluster ([NFR-10](../arch/02-requirements.md#nfr-10), [A-35](../arch/registers.md#a-35)).
- CI is the merge gate: every phase merged only on a green run ([A-40](../arch/registers.md#a-40)).

**Alternatives rejected.**

- Deploying for the exercise: two to three days of platform work for a one-evening box (Option B).
- Kubernetes locally (kind or minikube): heavier than Compose for the reviewer and adds nothing to review.
- Port 3000: collides with common development tools.

**Consequences.**

- Easier: the production path is the image to ECR, `helm upgrade` to EKS and Terraform for the infrastructure.
- Harder: the chart is not exercised beyond `helm lint`.
- Accepted: Redis is required, so Compose is the only supported start.
