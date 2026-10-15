import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AnomalyCounter, AppLogger, ConfigService } from '../infra/index.js';
import type { LocationFacts, MarineAvailability } from '../location/index.js';
import { PROVIDER } from './ranking.const.js';
import type { ActivityRanking, RankingInput, RankingResult } from './ranking.types.js';

function outOfRange(score: number | null): boolean {
  return score !== null && (score < 0 || score > 100);
}

function inDateOrder(ranking: ActivityRanking): boolean {
  return ranking.days.every(
    (day, index) => index === 0 || (ranking.days[index - 1]?.date ?? '') < day.date,
  );
}

// Invariant names double as the `type` label of ranking_anomalies_total.
function violations(ranking: ActivityRanking, windowDays: number): string[] {
  const found: string[] = [];
  if (ranking.days.some((day) => outOfRange(day.score))) {
    found.push('score_out_of_range');
  }
  if (ranking.status !== 'APPLICABLE') {
    return ranking.days.some((day) => day.score !== null)
      ? [...found, 'score_without_applicability']
      : found;
  }
  if (ranking.days.length !== windowDays || !inDateOrder(ranking)) {
    found.push('window_mismatch');
  }
  if (ranking.days.some((day) => day.score === null)) {
    found.push('missing_score');
  }
  return found;
}

// Traceability and anomaly detection (design D-7): in-request invariants and one structured event per ranking.
@Injectable()
export class RankingAuditService {
  private readonly logger: Logger;
  private readonly windowDays: number;

  constructor(
    private readonly anomalies: AnomalyCounter,
    logger: AppLogger,
    config: ConfigService,
  ) {
    this.logger = logger.pino.child({ component: 'RankingService' });
    this.windowDays = config.get('WINDOW_DAYS');
  }

  check(input: RankingInput, result: RankingResult): void {
    for (const ranking of result.rankings) {
      for (const type of violations(ranking, this.windowDays)) {
        this.logger.warn(
          {
            type,
            activity: ranking.activity,
            requestId: input.requestId,
            locationId: input.location.id,
          },
          'ranking invariant violated',
        );
        this.anomalies.increment(type);
      }
    }
  }

  // Always the full detail, whatever the API selection: the golden-set evaluation reads these offline.
  emit(input: RankingInput, result: RankingResult): void {
    this.logger.info(
      {
        event: 'ranking',
        requestId: input.requestId,
        locationId: input.location.id,
        provider: PROVIDER,
        fetchedAt: Object.fromEntries(
          input.sources.map(({ source, fetchedAt }) => [source, fetchedAt]),
        ),
        ruleSetVersion: result.ruleSetVersion,
        activities: result.rankings.map((ranking) => ({
          classifierId: ranking.activity,
          classifierVersion: ranking.classifierVersion,
          status: ranking.status,
          reason: ranking.reason,
          days: ranking.days.map(({ date, score, factors }) => ({ date, score, factors })),
        })),
      },
      'ranking',
    );
  }

  noteMarineAvailability(
    location: LocationFacts,
    previous: MarineAvailability,
    next: MarineAvailability,
  ): void {
    if (previous !== next) {
      this.logger.info(
        { event: 'marine_availability_changed', locationId: location.id, previous, next },
        'marine availability changed',
      );
    }
  }
}
