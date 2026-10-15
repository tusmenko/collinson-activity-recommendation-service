import { Injectable } from '@nestjs/common';

import { ConfigService } from '../infra/index';
import type { LocationFacts, MarineAvailability } from '../location/index';
import type { DaySignals } from '../weather/index';
import { RankingAuditService } from './audit/ranking-audit.service';
import { UnknownActivityError } from './ranking.errors';
import type { ActivityRanking, RankingInput, RankingResult } from './ranking.types';
import { failedSource, mergeDays, noSignals } from './ranking.util';
import { ClassifierRegistry } from './registry/classifier-registry.service';
import type { Classifier } from './registry/classifier.port';
import { RuleSetProvider } from './rules/rule-set.port';

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
