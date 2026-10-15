import { Injectable } from '@nestjs/common';
import type { Logger } from 'pino';

import { AnomalyCounter, AppLogger, ConfigService } from '../../infra/index';
import type { LocationFacts, MarineAvailability } from '../../location/index';
import type { RankingInput, RankingResult } from '../ranking.types';
import { PROVIDER } from './audit.const';
import { violations } from './audit.util';

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
