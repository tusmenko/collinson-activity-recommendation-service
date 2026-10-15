import type { ClockPort } from '../../../src/infra/index';
import { WeatherSourcePort } from '../../../src/weather/index';
import type {
  Coordinates,
  DaySignals,
  Source,
  SourceFetchOutcome,
} from '../../../src/weather/index';
import { loadFixture } from '../fixtures';

type Template = 'forecast' | 'marine' | 'marineInland';
type FailureReason = Extract<SourceFetchOutcome, { kind: 'failed' }>['reason'];

// `days` answers with fewer days than asked, like a provider cutting its horizon short; `fetchedAt`
// overrides the clock as the adapter's own fetch time.
interface OkStep {
  readonly kind: 'ok';
  readonly template?: Template;
  readonly days?: number;
  readonly fetchedAt?: string;
}

export type FakeStep =
  | OkStep
  // `raw` stands for a body that arrived but failed validation.
  | { readonly kind: 'fail'; readonly reason: FailureReason; readonly raw?: unknown }
  // Never answers until the test calls release(), like an upstream that stops responding.
  | { readonly kind: 'hang' };

const TEMPLATES = loadFixture('weather/day-signals.json') as Record<Template, DaySignals>;
const DAY_MS = 86_400_000;

// One stored-day shape per source, for seeding the store directly.
export function templateDay(source: Source, date: string): DaySignals {
  return { ...TEMPLATES[source === 'FORECAST' ? 'forecast' : 'marine'], date };
}

// UTC dates from the clock's day; the fake locations sit on UTC+0/+1, where 06:00Z is the same local date.
function datesFrom(now: Date, count: number): string[] {
  const start = Date.parse(now.toISOString().slice(0, 10));
  return Array.from({ length: count }, (_, index) =>
    new Date(start + index * DAY_MS).toISOString().slice(0, 10),
  );
}

// Scripted stand-in for an Open-Meteo adapter: steps are consumed one per call, then `fallback` repeats.
export class FakeWeatherSource extends WeatherSourcePort {
  calls = 0;
  private steps: FakeStep[] = [];
  private fallback: FakeStep;
  private hung: (() => void)[] = [];

  constructor(
    readonly source: Source,
    private readonly clock: ClockPort,
  ) {
    super();
    this.fallback = this.okStep();
  }

  respond(...steps: FakeStep[]): void {
    this.steps = steps;
  }

  always(step: FakeStep): void {
    this.steps = [];
    this.fallback = step;
  }

  release(): void {
    const pending = this.hung;
    this.hung = [];
    pending.forEach((resolve) => {
      resolve();
    });
  }

  reset(): void {
    this.release();
    this.calls = 0;
    this.steps = [];
    this.fallback = this.okStep();
  }

  fetchDays(_coordinates: Coordinates, days: number): Promise<SourceFetchOutcome> {
    this.calls += 1;
    const step = this.steps.shift() ?? this.fallback;
    switch (step.kind) {
      case 'ok':
        return Promise.resolve(this.ok(step, days));
      case 'fail':
        return Promise.resolve({
          kind: 'failed',
          reason: step.reason,
          detail: 'fake failure',
          ...(step.raw === undefined ? {} : { raw: step.raw }),
        });
      case 'hang':
        return new Promise((resolve) => {
          this.hung.push(() => {
            resolve({ kind: 'failed', reason: 'timeout', detail: 'released by the test' });
          });
        });
    }
  }

  private ok(step: OkStep, requested: number): SourceFetchOutcome {
    const now = this.clock.now();
    const template = TEMPLATES[step.template ?? this.defaultTemplate()];
    return {
      kind: 'ok',
      days: datesFrom(now, step.days ?? requested).map((date) => ({ ...template, date })),
      raw: { fake: this.source },
      providerSchemaVersion: 'fake-1',
      fetchedAt: step.fetchedAt ?? now.toISOString(),
    };
  }

  private okStep(): FakeStep {
    return { kind: 'ok' };
  }

  private defaultTemplate(): Template {
    return this.source === 'FORECAST' ? 'forecast' : 'marine';
  }
}
