import { Injectable } from '@nestjs/common';

import { ConfigService } from '../infra/index.js';
import type { LocationFacts, MarineAvailability } from '../location/index.js';
import type { DaySignals, Source } from '../weather/index.js';
import type { Classifier } from './classifier.port.js';
import { ClassifierRegistry } from './classifier-registry.service.js';
import { RankingAuditService } from './ranking-audit.service.js';
import { UnknownActivityError } from './ranking.errors.js';
import type { ActivityRanking, RankingInput, RankingResult } from './ranking.types.js';
import { RuleSetProvider } from './rule-set.port.js';

type SourceDays = RankingInput['days'];

// For a date a classifier returned outside the window; the invariants report it.
function noSignals(date: string): DaySignals {
  return {
    date,
    tempMax: null,
    tempMin: null,
    precipitation: null,
    precipitationProbability: null,
    snowfall: null,
    snowDepth: null,
    windMax: null,
    windGusts: null,
    cloudCover: null,
    uvIndex: null,
    sunshineHours: null,
    visibility: null,
    weatherCode: null,
    waveHeight: null,
    wavePeriod: null,
    swellHeight: null,
  };
}

function withMarine(day: DaySignals, marine: DaySignals | undefined): DaySignals {
  return {
    ...day,
    waveHeight: marine?.waveHeight ?? null,
    wavePeriod: marine?.wavePeriod ?? null,
    swellHeight: marine?.swellHeight ?? null,
  };
}

// One DaySignals per date: forecast fields from FORECAST, wave fields from MARINE, first WINDOW_DAYS dates.
function mergeDays(days: SourceDays, windowDays: number): DaySignals[] {
  const marine = new Map((days.MARINE ?? []).map((day) => [day.date, day]));
  const forecast = days.FORECAST ?? [];
  const base = forecast.length > 0 ? forecast : (days.MARINE ?? []);
  return [...base]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, windowDays)
    .map((day) => withMarine(day, marine.get(day.date)));
}

// A source that failed and left nothing stored; a failed refetch over stored days still ranks.
function failedSource(classifier: Classifier, input: RankingInput): Source | undefined {
  return classifier.requires.find(
    (source) =>
      (input.days[source]?.length ?? 0) === 0 &&
      input.sources.some((report) => report.source === source && report.status === 'FAILED'),
  );
}

// Scores computed on read by the registered classifiers (design D-6), checked and traced (D-7).
@Injectable()
export class RankingService {
  private readonly windowDays: number;

  constructor(
    private readonly registry: ClassifierRegistry,
    private readonly rules: RuleSetProvider,
    private readonly audit: RankingAuditService,
    config: ConfigService,
  ) {
    this.windowDays = config.get('WINDOW_DAYS');
  }

  async rank(input: RankingInput): Promise<RankingResult> {
    const classifiers = this.classifiersFor(input.activities);
    const days = mergeDays(input.days, this.windowDays);
    const rankings = await Promise.all(
      classifiers.map((classifier) => this.rankOne(classifier, days, input)),
    );
    const result: RankingResult = { rankings, ruleSetVersion: this.rules.version };
    this.audit.check(input, result);
    this.audit.emit(input, result);
    return result;
  }

  // Called when a refresh changes the stored fact; the api resolver owns the comparison's inputs.
  noteMarineAvailability(
    location: LocationFacts,
    previous: MarineAvailability,
    next: MarineAvailability,
  ): void {
    this.audit.noteMarineAvailability(location, previous, next);
  }

  private classifiersFor(activities: readonly string[]): Classifier[] {
    const ids = activities.length === 0 ? this.registry.ids() : activities;
    return ids.map((id) => {
      const classifier = this.registry.get(id);
      if (classifier === undefined) {
        throw new UnknownActivityError(id);
      }
      return classifier;
    });
  }

  private async rankOne(
    classifier: Classifier,
    days: readonly DaySignals[],
    input: RankingInput,
  ): Promise<ActivityRanking> {
    const { id: activity, version: classifierVersion } = classifier;
    const failed = failedSource(classifier, input);
    if (failed !== undefined) {
      const unscored = days.map((signals) => ({
        date: signals.date,
        score: null,
        factors: [],
        signals,
      }));
      return {
        activity,
        status: 'UNAVAILABLE',
        reason: `${failed} source failed`,
        classifierVersion,
        days: unscored,
      };
    }
    const output = await classifier.score({
      days,
      facts: input.location,
      rules: this.rules.get(activity),
    });
    const signalsByDate = new Map(days.map((day) => [day.date, day]));
    return {
      activity,
      status: output.status,
      reason: output.reason ?? null,
      classifierVersion,
      days: output.days.map((day) => ({
        ...day,
        signals: signalsByDate.get(day.date) ?? noSignals(day.date),
      })),
    };
  }
}
