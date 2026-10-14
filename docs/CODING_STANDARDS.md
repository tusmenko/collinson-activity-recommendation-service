# Coding Standards

Good defaults for a NestJS service, enforced by tools in phase 0 rather than by review. Every rule names its tool and its gate. A rule without a tool is a guideline and says so.

## Principles

| Principle | What it means here | Enforced by |
| --- | --- | --- |
| Single responsibility | One provider does one thing. Resolvers only translate GraphQL to one service call; services hold use-case logic and never touch HTTP or Redis; repositories are the only code that imports `ioredis`; adapters are the only code that knows a provider's payload shape; classifiers only score | dependency-cruiser layer rules; `max-classes-per-file: 1`; review |
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

Modules and the direction they may import, enforced by dependency-cruiser with `no-circular` on:

```text
api        → ranking, location, weather (services and types only), infra
ranking    → location (types), weather (types), infra
weather    → infra
location   → infra
infra      → nothing in the application
```

Adapters live in `weather/adapters` and `location/adapters` and are imported only by their module's services. Repositories live in `*/repositories` and are the only importers of `ioredis`. Test code may import anything.

## TypeScript and language

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, ESM with `.js` import suffixes.
- `@typescript-eslint/no-explicit-any`, `no-non-null-assertion`, `no-floating-promises`, `require-await`, `switch-exhaustiveness-check` as errors.
- Discriminated unions over boolean flags for outcomes (`{ kind: 'ok' } | { kind: 'failed'; reason }`).
- `readonly` on DTO and value-object fields; immutability by default.
- No `console`; pino child logger per module. No `process.env` outside `infra/config`.
- Timeouts through `AbortSignal.timeout`, never `setTimeout` races.

## NestJS shape

- One module per folder: `location`, `weather`, `ranking`, `api`, `infra`; file suffixes `.module.ts`, `.service.ts`, `.resolver.ts`, `.adapter.ts`, `.repository.ts`, `.classifier.ts`, `.schema.ts`, `.spec.ts`.
- Injection by abstract-class tokens for anything with more than one implementation (repositories, adapters, rule-set provider); concrete classes elsewhere.
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

- Conventional commits, scope is the module (`feat(weather): ...`); the body names the test ids or scenarios covered and any cut with its reason.
- One pull request per phase, squash-merged on green CI; the attribution lines from the session are kept.

## Enforcement summary

| Tool | Runs | Gate |
| --- | --- | --- |
| prettier | pre-commit (lint-staged), CI | formatting |
| eslint: typescript-eslint strict-type-checked and stylistic, core `max-*` and `complexity`, sonarjs cognitive complexity, `no-process-env`, `no-console` | pre-commit (staged), CI (all) | errors fail |
| `tsc --noEmit` strict | pre-commit, CI | errors fail |
| dependency-cruiser | CI | layer or cycle violation fails |
| knip | CI | unused exports and dependencies fail |
| commitlint | commit-msg | convention |
| Vitest with coverage gates | pre-push (unit, integration), CI (all) | thresholds fail |
