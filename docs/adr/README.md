# Architecture Decision Records

One file per decision, numbered, never edited into a different decision: a change is a new record that supersedes the old one. Status is one of proposed, accepted, superseded, deprecated. Records are made during the architecture process and keep growing during and after implementation.

| ID | Title | Status | Date | Addresses | Rationale |
| --- | --- | --- | --- | --- | --- |
| [ADR-0001](0001-pragmatic-option-nestjs-redis-bullmq.md) | Pragmatic option on NestJS, Redis and BullMQ | accepted | 2026-10-15 | NFR-2, NFR-10, one-evening constraint | Option C meets every ASR in the time box and degrades to A; elaborated by ADR-0002 to ADR-0009. |
| [ADR-0002](0002-redis-only-store.md) | Redis with AOF as the only store | accepted | 2026-10-14 | Persist constraint, NFR-1, ASR-5, A-43, A-47, A-49 | TTL and persistence are native; the data is a cache plus small facts; facts without TTL are the enrichment landing zone. |
| [ADR-0003](0003-refresh-on-read-single-flight.md) | Refresh on read with single-flight queued jobs | accepted | 2026-10-15 | NFR-1, NFR-3, NFR-9, QAS-2, QAS-4, ASR-3, A-51 | One upstream call per expiry whatever the readers; fair use spent only on requested places; durable across instances. |
| [ADR-0004](0004-scores-on-read-registered-classifiers.md) | Scores computed on read by registered classifiers | accepted | 2026-10-14 | FR-3, FR-4, NFR-7, NFR-13, QAS-7, ASR-1, H-1 | Store stays pure signals; a rule change needs no re-ingest; a new activity is one folder plus one registration. |
| [ADR-0005](0005-provider-neutral-signals-behind-ports.md) | Provider-neutral signals behind ports | accepted | 2026-10-15 | NFR-11, ASR-2, A-41 | A second provider is a client plus adapters; pinned payload schemas make drift an anomaly; raw payload kept for replay. |
| [ADR-0006](0006-degradation-policy.md) | Degradation policy | accepted | 2026-10-14 | NFR-4, DF-6, QAS-3, QAS-11, ASR-4, A-19 | Stored data always answers; bounded wait and typed errors; a failing source or alternative costs only its own part. |
| [ADR-0007](0007-offline-test-pyramid.md) | Offline test pyramid with a stub upstream and a network guard | accepted | 2026-10-14 | NFR-6, QAS-9, A-21 | Zero live calls; every level in CI under five minutes; a per-file coverage floor. |
| [ADR-0008](0008-traceability-events-invariants.md) | Traceability through structured events and invariants | accepted | 2026-10-14 | NFR-5, NFR-13, A-30, A-42 | Every score auditable to data and versions; invariant violations counted; events feed the golden-set evaluation. |
| [ADR-0009](0009-delivery-compose-helm-actions.md) | Delivery: Compose to run, Helm as the production path, GitHub Actions as the gate | accepted | 2026-10-15 | NFR-2, NFR-10, QAS-8, A-17, A-35, A-40 | One command on a clean clone; port 4510 avoids editor collisions; Kubernetes shown and linted, not deployed. |
