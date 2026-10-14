# Coding Standards

Good defaults for a NestJS service, enforced by tools in phase 0 rather than by review. Every rule names its tool and its gate. A rule without a tool is a guideline and says so.

## Principles

| Principle | What it means here | Enforced by |
| --- | --- | --- |
| Single responsibility | One provider does one thing and one file holds one concern. Transport only translates and delegates; application services hold use-case logic and never touch a protocol or a store; repositories and adapters are the only code that imports a client library or knows a provider's payload shape; domain logic is pure | dependency-cruiser layer rules; `max-classes-per-file: 1`; file-layout lint; review |
| Keep it simple | No abstraction before the third concrete use; no generic helpers or utility barrels; no configuration for things that do not vary | review; knip reports unused exports |
| Don't repeat yourself, within a module | Duplication inside a module is removed; duplication across modules is allowed until the third copy, then lifted into the module that owns the concept | review |
| Explicit over clever | Explicit return types on exported functions; no `any`; no non-null assertions; no implicit index access | typescript-eslint strict-type-checked; `tsc --strict` |
| Fail loudly at the boundary, never inside | Zod at every boundary (arguments, config, upstream payloads); adapters never throw raw errors, they return typed outcomes; the exception filter maps domain errors to GraphQL codes | `no-process-env`; `@typescript-eslint/only-throw-error`; review |
| Small units | Files, functions and parameter lists stay small enough to read in one screen | `max-lines`, `max-lines-per-function`, `max-params`, `complexity`, `max-depth` |

## Size and complexity limits

| Limit | Value | Rule |
| --- | --- | --- |
| Lines per file, excluding blanks and comments | 300 | `max-lines` |
| Lines per function | 50 | `max-lines-per-function` |
| Parameters per function | 4 | `max-params` |
| Cyclomatic complexity | 10 | `complexity` |
| Cognitive complexity | 15 | `sonarjs/cognitive-complexity` |
| Nesting depth | 3 | `max-depth` |
| Classes per file | 1 | `max-classes-per-file` |

Limits are errors in CI. A justified exception uses an inline `eslint-disable-next-line` with a reason; more than five in the repository is a smell the README mentions.

## Layering

Generic rule; the concrete modules of this service and their allowed imports are listed once, in the design document ([D-1](ACTIVITY_RANKING_DESIGN.md#d-1)), and the dependency-cruiser configuration is generated from that list so the standards never drift from the design.

| Layer | Role | May import |
| --- | --- | --- |
| Transport | Resolvers, controllers, pipes, filters | application services and their public types |
| Application | Use-case services, orchestration | domain, ports (abstract classes or interfaces), infrastructure utilities |
| Domain | Pure logic: classifiers, rules, invariants, value types | nothing outside its own module except shared types |
| Ports and adapters | Adapters to external providers, repositories to stores | the port it implements, infrastructure utilities, the client library it wraps |
| Infrastructure | Config, logging, telemetry, health, clients | nothing from the application |

Rules enforced by dependency-cruiser: no cycles; imports only in the direction above; a client library (HTTP client, `ioredis`, queue client) is imported only by the adapters or repositories that wrap it; cross-module imports go through the module's public barrel only.

## File layout

One concern per file, named by postfix. Lint enforces the names (`eslint-plugin-check-file`) and the placement of exported type declarations (`no-restricted-syntax` per glob); the rest is review.

| Postfix | Holds | Notes |
| --- | --- | --- |
| `*.module.ts` | the Nest module | one per folder |
| `*.service.ts` | one application or domain service | one class |
| `*.resolver.ts`, `*.controller.ts` | transport | no logic beyond validation and one service call |
| `*.adapter.ts`, `*.repository.ts` | ports and adapters implementations | the only importers of their client library |
| `*.port.ts` | abstract classes or interfaces that adapters and repositories implement; the DI tokens | tokens as abstract classes, no string tokens |
| `*.types.ts` | exported interfaces, type aliases, enums | exported type declarations are not allowed in other files |
| `*.const.ts` | exported constants and lookup tables | no logic |
| `*.schema.ts` | Zod schemas and the types inferred from them | the inferred type is exported from here, not duplicated in `*.types.ts` |
| `*.errors.ts` | typed error classes of the module | |
| `*.classifier.ts`, `*.rules.json` | one classifier and its thresholds | project-specific postfix, declared in the design |
| `*.spec.ts` | unit tests, colocated | name starts with the test id |
| `*.fixture.ts`, `test/fixtures/**` | test data | data only |
| `index.ts` | the module's public barrel | one per module folder, exports only what other modules may use; no nested barrels; no `export *` |

Examples in this document use names from this service for illustration; the authoritative names are in the design document.

## TypeScript and language

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, ESM with `.js` import suffixes.
- `@typescript-eslint/no-explicit-any`, `no-non-null-assertion`, `no-floating-promises`, `require-await`, `switch-exhaustiveness-check` as errors.
- Discriminated unions over boolean flags for outcomes (`{ kind: 'ok' } | { kind: 'failed'; reason }`).
- `readonly` on DTO and value-object fields; immutability by default.
- No `console`; pino child logger per module. No `process.env` outside `infra/config`.
- Timeouts through `AbortSignal.timeout`, never `setTimeout` races.

## NestJS shape

- One module per folder, named in the design document; files follow the layout table above.
- Injection by abstract-class tokens declared in `*.port.ts` for anything with more than one implementation; concrete classes elsewhere.
- Providers are stateless except explicit caches; request-scoped providers are not used.
- GraphQL code-first; the schema file is generated and committed; resolvers contain no logic beyond argument validation and one service call.
- No custom decorators in the exercise.

## Tests

- Colocated `*.spec.ts` for unit tests; `test/integration` and `test/e2e` for the rest; one behaviour per `it`; arrange, act, assert; the test name starts with its id from the [test plan](ACTIVITY_RANKING_TEST_PLAN.md).
- No sleeps: fake timers or awaited events. No live network: the harness guard fails the test.
- Fixtures are data files, never built inline beyond three fields.

## Naming and comments

- Files kebab-case; classes PascalCase; constants `UPPER_SNAKE` only for true constants; no `I` prefix on interfaces.
- Comments explain why, not what; a `TODO` carries an id from the registers or the test plan.

## Commits and pull requests

- Conventional commits, scope is the module (`feat(<module>): ...`); the body names the test ids or scenarios covered and any cut with its reason.
- One pull request per phase, squash-merged on green CI; the attribution lines from the session are kept.

## Enforcement summary

| Tool | Runs | Gate |
| --- | --- | --- |
| prettier | pre-commit (lint-staged), CI | formatting |
| eslint: typescript-eslint strict-type-checked and stylistic, core `max-*` and `complexity`, sonarjs cognitive complexity, `check-file` naming, `no-restricted-syntax` for type placement, `no-process-env`, `no-console` | pre-commit (staged), CI (all) | errors fail |
| `tsc --noEmit` strict | pre-commit, CI | errors fail |
| dependency-cruiser | CI | layer or cycle violation fails |
| knip | CI | unused exports and dependencies fail |
| commitlint | commit-msg | convention |
| Vitest with coverage gates | pre-push (unit, integration), CI (all) | thresholds fail |
